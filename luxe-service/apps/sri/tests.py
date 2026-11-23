import unittest
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from apps.sri.services import SRIIntegrationService


class SRIIntegrationServiceCustomerTests(unittest.TestCase):
    def _make_customer(self, cedula, full_name, email="", phone="", address=""):
        return SimpleNamespace(
            cedula=cedula,
            email=email,
            phone=phone,
            address=address,
            get_full_name=lambda: full_name,
        )

    def test_consumidor_final_when_no_customer(self):
        data = SRIIntegrationService.resolve_customer_data(None)
        self.assertEqual(data["ident_type"], "07")
        self.assertEqual(data["ident_number"], "9999999999999")
        self.assertEqual(data["name"], "CONSUMIDOR FINAL")
        self.assertEqual(data["email"], "")
        self.assertEqual(data["address"], "S/D")

    def test_consumidor_final_forces_exact_name_even_if_reversed(self):
        """Regla SRI Error 69: 9999999999999 siempre debe enviar 'CONSUMIDOR FINAL'."""
        bad_customer = self._make_customer(
            cedula="9999999999999",
            full_name="FINAL CONSUMIDOR",
            email="final5171@sincorreo.com",
            phone="0999999999",
            address="CONSUMIDOR FINAL",
        )
        data = SRIIntegrationService.resolve_customer_data(bad_customer)
        self.assertEqual(data["ident_type"], "07")
        self.assertEqual(data["ident_number"], "9999999999999")
        self.assertEqual(data["name"], "CONSUMIDOR FINAL")
        self.assertEqual(data["email"], "")
        self.assertEqual(data["phone"], "")
        self.assertEqual(data["address"], "S/D")

    def test_consumidor_final_when_cedula_is_blank_or_whitespace(self):
        for raw_cedula in ("", "   ", None):
            customer = self._make_customer(
                cedula=raw_cedula,
                full_name="FINAL CONSUMIDOR",
                email="test@sincorreo.com",
            )
            data = SRIIntegrationService.resolve_customer_data(customer)
            self.assertEqual(data["ident_type"], "07")
            self.assertEqual(data["ident_number"], "9999999999999")
            self.assertEqual(data["name"], "CONSUMIDOR FINAL")
            self.assertEqual(data["email"], "")

    def test_regular_customer_with_cedula_preserves_data(self):
        customer = self._make_customer(
            cedula=" 0706507639 ",
            full_name="Luis Torres",
            email="luis@example.com",
            phone="0961454926",
            address="Cuenca",
        )
        data = SRIIntegrationService.resolve_customer_data(customer)
        self.assertEqual(data["ident_type"], "05")
        self.assertEqual(data["ident_number"], "0706507639")
        self.assertEqual(data["name"], "Luis Torres")
        self.assertEqual(data["email"], "luis@example.com")
        self.assertEqual(data["phone"], "0961454926")
        self.assertEqual(data["address"], "Cuenca")

    def test_regular_customer_with_ruc_preserves_data(self):
        customer = self._make_customer(
            cedula="0102753340001",
            full_name="Greys Velastegui",
            email="greys@example.com",
            phone="0968389933",
            address="",
        )
        data = SRIIntegrationService.resolve_customer_data(customer)
        self.assertEqual(data["ident_type"], "04")
        self.assertEqual(data["ident_number"], "0102753340001")
        self.assertEqual(data["name"], "Greys Velastegui")
        self.assertEqual(data["address"], "S/D")

    @patch("apps.sri.services.SRIDocument.objects.get_or_create")
    @patch("apps.sri.services.requests.post")
    @patch("apps.sri.services.SRIIntegrationService.get_config")
    def test_emit_invoice_payload_forces_consumidor_final(
        self, mock_get_config, mock_post, mock_get_or_create
    ):
        mock_get_config.return_value = SimpleNamespace(
            is_active=True,
            auth_token="vsr_test_token",
            api_url="https://apivendo.fronteratech.ec/api/sri/documents/create_and_process_invoice_complete/",
            company_id=42,
        )
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "success": True,
            "invoice": {"number": "001-001-000000114", "access_key": "1234567890"},
        }
        mock_post.return_value = mock_resp

        sri_doc = MagicMock()
        sri_doc.external_id = None
        mock_get_or_create.return_value = (sri_doc, True)

        product = SimpleNamespace(id=1, code="TF00000149", name="CAMISETA", tax_rate=Decimal("0.00"))
        item = SimpleNamespace(product=product, quantity=Decimal("1"), unit_price=Decimal("30.00"), line_total=Decimal("30.00"))
        items_qs = MagicMock()
        items_qs.all.return_value = [item]

        payments_qs = MagicMock()
        payments_qs.exists.return_value = False

        order = SimpleNamespace(
            order_number="ORD-001",
            customer=self._make_customer(
                cedula="9999999999999",
                full_name="FINAL CONSUMIDOR",
                email="final5171@sincorreo.com",
                address="CONSUMIDOR FINAL",
            ),
            discount_amount=Decimal("0.00"),
            total=Decimal("30.00"),
            created_at=datetime(2026, 11, 23, 15, 0, tzinfo=timezone.utc),
            items=items_qs,
            payments=payments_qs,
        )

        SRIIntegrationService.emit_invoice(order)

        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["customer_identification_type"], "07")
        self.assertEqual(sent_payload["customer_identification"], "9999999999999")
        self.assertEqual(sent_payload["customer_name"], "CONSUMIDOR FINAL")
        self.assertEqual(sent_payload["customer_email"], "")
        self.assertEqual(sent_payload["customer_address"], "S/D")
