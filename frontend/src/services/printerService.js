// src/services/printerService.js
import api from './api';

const PRINTER_API_URL = `${process.env.REACT_APP_LUXE_SERVICE}/api/hardware`;

class PrinterService {
  async printReceipt(orderData, printerId = null) {
    try {
      const response = await api.post(`${PRINTER_API_URL}/print/receipt/`, {
        order: orderData,
        printer_id: printerId
      });
      return response.data;
    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      throw error;
    }
  }

  async openCashDrawer(printerId = null) {
    try {
      const response = await api.post(`${PRINTER_API_URL}/open-drawer/`, {
        printer_id: printerId
      });
      return response.data;
    } catch (error) {
      console.error('Error al abrir caja:', error);
      throw error;
    }
  }

  async getPrintStatus() {
    try {
      const response = await api.get(`${PRINTER_API_URL}/status/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estado:', error);
      return null;
    }
  }

  async printLabels(products, copies = 1, printerId = null) {
    try {
      const response = await api.post(`${PRINTER_API_URL}/print/label/`, {
        products: products,
        copies: copies,
        printer_id: printerId
      });
      return response.data;
    } catch (error) {
      console.error('Error al imprimir etiquetas:', error);
      throw error;
    }
  }
}

const printerServiceInstance = new PrinterService();
export default printerServiceInstance;

