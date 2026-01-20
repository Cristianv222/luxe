// modulos/fast-food/Reportes.js - VERSIÓN COMPLETA CORREGIDA CON FILTROS Y FECHA FIXED
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
// jsPDF import removed
import 'jspdf-autotable';

import { formatCurrency, formatDate, getValidDate, generateDetailedPDF, getEcuadorDate } from '../../utils/reportUtils';

// ====================================================================
// 1. Funciones de Ayuda (Estilos, Formato)
// ====================================================================
const COLORS = ['#CFB3A9', '#A09086', '#D8C3B9', '#2C2C2C', '#E8C4C4', '#8B7355', '#D2B48C', '#B0C4DE']; // Boutique Palette

const getFastFoodBaseURL = () => {
    return process.env.REACT_APP_LUXE_SERVICE || 'http://localhost/api/luxe';
};

// Reemplaza la función isSameLocalDate con esta versión corregida:
const isSameLocalDate = (date1, date2) => {
    if (!date1 || !date2) {
        console.log('isSameLocalDate: fecha(s) inválida(s)', { date1, date2 });
        return false;
    }

    const d1 = getValidDate(date1);
    const d2 = getValidDate(date2);

    if (!d1 || !d2) {
        console.log('isSameLocalDate: no se pudo obtener fecha válida', { d1, d2, date1, date2 });
        return false;
    }

    // Obtener componentes de fecha local
    const year1 = d1.getFullYear();
    const month1 = d1.getMonth();
    const day1 = d1.getDate();

    const year2 = d2.getFullYear();
    const month2 = d2.getMonth();
    const day2 = d2.getDate();

    const result = (year1 === year2 && month1 === month2 && day1 === day2);

    console.log('isSameLocalDate comparación:', {
        fecha1: d1.toISOString(),
        fecha1_local: `${day1}/${month1 + 1}/${year1}`,
        fecha2: d2.toISOString(),
        fecha2_local: `${day2}/${month2 + 1}/${year2}`,
        resultado: result
    });

    return result;
};
// ====================================================================
// 2. Lógica del PDF (Impresión Detallada) - SIN EMOJIS
// ====================================================================

// generateDetailedPDF importado de ../../../utils/reportUtils

// ====================================================================
// 3. Componente Principal (Reportes)
// ====================================================================

const Reportes = () => {
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');
    const [reports, setReports] = useState([]);
    const [currentReport, setCurrentReport] = useState(null);
    const [reportType, setReportType] = useState('daily');
    const [dateRange, setDateRange] = useState({
        startDate: getEcuadorDate(),
        endDate: getEcuadorDate()
    });
    const [filterType, setFilterType] = useState('today');
    const [dashboardStats, setDashboardStats] = useState(null);
    const [connectionError, setConnectionError] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');
    const [noReportMessage, setNoReportMessage] = useState('');

    // ========== NUEVOS ESTADOS PARA EL MODAL ==========
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);

    // ========== ESTADOS PARA GESTIÓN DE TURNOS (SOLICITADO POR USUARIO) ==========
    const [currentShift, setCurrentShift] = useState(null);
    const [showShiftModal, setShowShiftModal] = useState(false); // Para abrir turno
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState(''); // Para cerrar turno (opcional en flujo rápido, pero recomendado)
    const [managerName, setManagerName] = useState(''); // Nombre del encargado (Nuevo, reemplaza selección de usuario compleja)
    const [shiftNotes, setShiftNotes] = useState('');
    const [processingShift, setProcessingShift] = useState(false);
    const [dayShifts, setDayShifts] = useState([]); // Turnos del día seleccionado
    // ==================================================

    // Cargar estadísticas del dashboard
    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await api.get('/api/pos/daily-summaries/dashboard/', {
                baseURL: getFastFoodBaseURL(),
                timeout: 20000
            });
            setDashboardStats(response.data);
            return true;
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
            throw new Error(`Dashboard no disponible: ${err.message}`);
        }
    }, []);

    // Fetch shifts for a specific date
    const fetchDayShifts = useCallback(async (dateStr) => {
        if (!dateStr) return;
        try {
            const response = await api.get(`/api/pos/shifts/by_date/?date=${dateStr}`, {
                baseURL: getFastFoodBaseURL()
            });
            if (response.data && response.data.shifts) {
                setDayShifts(response.data.shifts);
            } else {
                setDayShifts([]);
            }
        } catch (err) {
            console.error('Error fetching day shifts:', err);
            setDayShifts([]);
        }
    }, []);

    // Print Shift Report (Fetch detailed data first)
    const handlePrintShiftReport = async (shiftId) => {
        if (!shiftId) return;
        try {
            const response = await api.get(`/api/pos/shifts/${shiftId}/report/`, {
                baseURL: getFastFoodBaseURL()
            });
            const reportData = response.data;
            // Add flag to satisfy reportUtils check
            reportData.is_shift_report = true;
            generateDetailedPDF(reportData, 'shift', '');
        } catch (err) {
            console.error('Error generating shift PDF:', err);
            alert('Error al generar el PDF del turno.');
        }
    };



    // ========== GESTIÓN DE TURNOS ==========
    const checkCurrentShift = useCallback(async () => {
        try {
            const response = await api.get('/api/pos/shifts/current/', {
                baseURL: getFastFoodBaseURL()
            });
            // La respuesta es { shift: { ... } } o { message: "...", shift: null }
            setCurrentShift(response.data.shift);
        } catch (err) {
            console.error('Error checking current shift:', err);
        }
    }, []);



    const handleOpenShift = async (e) => {
        e?.preventDefault();

        if (!managerName.trim()) {
            alert('Por favor, ingresa el nombre del encargado.');
            return;
        }

        setProcessingShift(true);
        try {
            // Enviamos el nombre del encargado y el efectivo inicial
            await api.post('/api/pos/shifts/', {
                manager_name: managerName,
                opening_cash: parseFloat(openingCash) || 0,
                notes: shiftNotes || 'Apertura Simplificada'
            }, { baseURL: getFastFoodBaseURL() });

            await checkCurrentShift();
            setShowShiftModal(false);
            setManagerName(''); // Reset
            setShiftNotes('');
            alert('Turno abierto correctamente.');
        } catch (err) {
            console.error('Error opening shift:', err);
            const msg = err.response?.data?.detail
                || err.response?.data?.non_field_errors?.[0]
                || (typeof err.response?.data === 'string' ? err.response?.data : '')
                || err.message
                || 'Error desconocido';
            alert('Error al abrir turno: ' + msg);
        } finally {
            setProcessingShift(false);
        }
    };

    const handleCloseShift = async () => {
        if (!currentShift) return;
        if (!window.confirm(`¿Seguro que deseas cerrar el Turno #${currentShift.shift_number}?`)) return;

        setProcessingShift(true);
        try {
            await api.post(`/api/pos/shifts/${currentShift.id}/close/`, {
                closing_cash: parseFloat(closingCash) || 0,
                closing_notes: 'Cierre desde Reportes'
            }, { baseURL: getFastFoodBaseURL() });

            // Reporte y PDF
            try {
                const reportResponse = await api.get(`/api/pos/shifts/${currentShift.id}/report/`, {
                    baseURL: getFastFoodBaseURL()
                });

                const shiftData = reportResponse.data;
                const normalizedReport = {
                    ...shiftData.summary,
                    shift_info: shiftData.shift_info,
                    orders_detail: shiftData.orders_detail,
                    payment_methods: shiftData.payment_methods,
                    top_products: shiftData.top_products,
                    date: shiftData.shift_info.opened_at,
                    is_shift_report: true,
                    generated_by: shiftData.shift_info.user
                };

                generateDetailedPDF(normalizedReport, 'Reporte de Turno', `Cierre Turno #${currentShift.shift_number}`);
            } catch (e) { console.error("Error PDF", e); }

            setCurrentShift(null);
            alert('Turno cerrado y reporte generado.');
            fetchReports(); // Actualizar lista
        } catch (err) {
            console.error('Error closing shift:', err);
            alert('Error al cerrar el turno.');
        } finally {
            setProcessingShift(false);
        }
    };

    // Obtener la lista de reportes recientes
    const fetchReports = useCallback(async () => {
        try {
            setLoadingData(true);
            setConnectionError(false);
            setError('');
            setNoReportMessage('');

            console.log('=== INICIO fetchReports ===');
            const today = getEcuadorDate();
            console.log('Fecha de hoy (cliente):', today.toLocaleDateString('es-MX'), today.toISOString());

            const listResponse = await api.get('/api/pos/daily-summaries/', {
                baseURL: getFastFoodBaseURL(),
                params: { ordering: '-date', limit: 30 },
                timeout: 10000
            });

            let reportsData = listResponse.data.results || listResponse.data;
            if (!Array.isArray(reportsData)) reportsData = [];

            console.log(`Se obtuvieron ${reportsData.length} reportes del servidor`);

            // Imprimir las fechas de los reportes para debug
            reportsData.forEach((report, index) => {
                const reportDate = report.date || report.start_date;
                console.log(`Reporte ${index}: ${reportDate} (${formatDate(reportDate)})`);
            });

            const todayStr = format(today, 'yyyy-MM-dd');
            console.log('Buscando reporte para hoy (str):', todayStr);

            // Buscar reporte de hoy en la lista recibida
            let todayReport = null;
            for (const report of reportsData) {
                const reportDate = report.date || report.start_date;
                if (reportDate) {
                    console.log(`Comparando reporte ${reportDate} con hoy ${todayStr}`);
                    if (isSameLocalDate(reportDate, todayStr)) {
                        todayReport = report;
                        console.log('¡Reporte de hoy encontrado en lista!');
                        break;
                    }
                }
            }

            // Si no hay reporte de hoy, intentar obtener del endpoint /today/
            if (!todayReport) {
                console.log('No se encontró reporte de hoy en lista, intentando endpoint /today/');
                try {
                    const todayResponse = await api.get('/api/pos/daily-summaries/today/', {
                        baseURL: getFastFoodBaseURL(),
                        timeout: 5000
                    });
                    todayReport = todayResponse.data;
                    console.log('Reporte de hoy obtenido de endpoint /today/:', todayReport?.date);
                } catch (err) {
                    console.warn('No se pudo obtener reporte específico de hoy:', err);
                }
            } else {
                console.log('Reporte de hoy encontrado en lista:', todayReport.date);
            }

            // Procesar lista de reportes
            const updatedReports = [];
            if (todayReport) {
                // Filtrar reportes que no sean de hoy
                const todayDate = todayReport.date_formatted || todayReport.date;
                console.log('Filtrando reportes que no sean de:', todayDate);

                const otherReports = reportsData.filter(r => {
                    const reportDate = r.date_formatted || r.date;
                    const isSame = reportDate && isSameLocalDate(reportDate, todayDate);
                    console.log(`  - Reporte ${reportDate}: ${isSame ? 'ES hoy' : 'NO es hoy'}`);
                    return !isSame;
                });

                console.log(`Se encontraron ${otherReports.length} reportes que no son de hoy`);
                updatedReports.push(...otherReports);
                updatedReports.unshift(todayReport);
            } else {
                updatedReports.push(...reportsData);
            }

            console.log(`Total reportes finales: ${updatedReports.length}`);
            console.log('=== FIN fetchReports ===');

            setReports(updatedReports);
            return updatedReports;

        } catch (err) {
            console.error('Error loading reports (fetchReports):', err);
            // throw new Error('Error al cargar reportes listados.'); 
            return []; // Retornar vacío para no romper inicialización
        } finally {
            setLoadingData(false);
        }
    }, []);
    // ========== NUEVA FUNCIÓN PARA VER DETALLE DEL REPORTE ==========
    const verDetalleReporte = async (reportId, isShift = false) => {
        try {
            setModalLoading(true);
            setShowModal(true);

            let response;
            if (isShift) {
                response = await api.get(`/api/pos/shifts/${reportId}/report/`, {
                    baseURL: getFastFoodBaseURL()
                });
                // Normalizar datos del turno para que coincidan con la estructura esperada por el UI y PDF
                const shiftData = response.data;
                const normalizedReport = {
                    ...shiftData.summary, // total_sales, total_orders, etc
                    shift_info: shiftData.shift_info,
                    orders_detail: shiftData.orders_detail,
                    payment_methods: shiftData.payment_methods,
                    top_products: shiftData.top_products,
                    date: shiftData.shift_info.opened_at, // Para la fecha del reporte
                    is_shift_report: true, // Flag para identificar
                    generated_by: shiftData.shift_info.user
                };
                setCurrentReport(normalizedReport);
            } else {
                response = await api.get(`/api/pos/daily-summaries/${reportId}/detail_with_orders/`, {
                    baseURL: getFastFoodBaseURL()
                });
                setCurrentReport(response.data);
                // Cargar turnos si tenemos fecha disponible
                if (response.data.date) {
                    fetchDayShifts(response.data.date).catch(e => console.warn("Error fetching shifts for detail:", e));
                }
            }

        } catch (err) {
            console.error("Error al obtener detalle:", err);
            alert("No se pudo cargar el detalle del reporte.");
            setShowModal(false);
        } finally {
            setModalLoading(false);
        }
    };
    // ================================================================

    // ========== FUNCIÓN MODIFICADA: SOLO CARGA REPORTES EXISTENTES ==========
    const loadDailyReport = useCallback(async (date, shouldGenerate = false) => {
        try {
            setLoadingData(true);
            setConnectionError(false);
            setError('');
            setNoReportMessage('');
            setDebugInfo('');

            const dateStr = format(date, 'yyyy-MM-dd');
            const targetDate = getValidDate(dateStr);

            if (!targetDate) {
                setNoReportMessage(`Fecha inválida: ${format(date, 'dd/MM/yyyy')}`);
                return;
            }

            // PRIMERO: Buscar si ya existe un reporte para esta fecha
            const existingReport = reports.find(report => {
                const reportDate = report.date || report.start_date;
                return reportDate && isSameLocalDate(reportDate, targetDate);
            });

            if (existingReport && !shouldGenerate) {
                // Si ya existe un reporte y no debemos generarlo, lo usamos
                console.log("Usando reporte existente para:", dateStr);
                setCurrentReport(existingReport);
                // Asegurar que se carguen los turnos del día para el desglose
                fetchDayShifts(dateStr).catch(err => console.warn("Error fetching shifts in background:", err));
                return;
            }

            // Si no existe reporte y no se debe generar
            if (!shouldGenerate) {
                setNoReportMessage(`No hay reporte disponible para la fecha ${format(date, 'dd/MM/yyyy')}`);
                setCurrentReport(null);
                return;
            }

            // SOLO generar nuevo reporte si se solicita explícitamente
            console.log("Generando nuevo reporte para:", dateStr);
            const response = await api.post('/api/pos/daily-summaries/generate/', {
                date: dateStr,
                detailed: true,
                include_orders_detail: true
            }, {
                baseURL: getFastFoodBaseURL(),
                timeout: 15000
            });

            // FIX: El backend devuelve { message: "...", summary: { ... } }
            const responseData = response.data.data || response.data;
            const generatedSummary = responseData.summary || responseData;

            if (generatedSummary) {
                setCurrentReport(generatedSummary);
                // Actualizar la lista de reportes
                await fetchReports();
                // Cargar turnos del día
                await fetchDayShifts(dateStr);
            }

        } catch (err) {
            console.error('Error loading daily report:', err);

            let errorMessage = `Error al cargar reporte para ${format(date, 'dd/MM/yyyy')}.`;
            if (err.response?.status === 500) {
                errorMessage += '\n\nError interno del servidor (500). Revise los logs.';
            }

            setConnectionError(true);
            setDebugInfo(`URL: ${getFastFoodBaseURL()}\nFecha: ${format(date, 'yyyy-MM-dd')}\nError: ${err.message}`);
            setError(errorMessage);

        } finally {
            setLoadingData(false);
        }
    }, [reports, fetchReports, fetchDayShifts]);

    // ========== FUNCIÓN MODIFICADA: SOLO GENERA REPORTES CUANDO SE PIDE EXPLÍCITAMENTE ==========
    const generateReport = useCallback(async (currentReportType, currentRange, shouldGenerate = false) => {
        try {
            setLoadingData(true);
            setConnectionError(false);
            setError('');
            setNoReportMessage('');
            setDebugInfo('');

            const startDate = format(currentRange.startDate, 'yyyy-MM-dd');
            const endDate = format(currentRange.endDate, 'yyyy-MM-dd');

            if (currentReportType === 'daily') {
                // Para reportes diarios, buscar primero si ya existe
                await loadDailyReport(currentRange.startDate, shouldGenerate);
                return;
            }

            // Para reportes de rango, siempre mostrar datos existentes primero
            if (!shouldGenerate) {
                // Buscar reportes existentes que coincidan con el rango
                const filteredReports = reports.filter(report => {
                    const reportDate = getValidDate(report.date || report.start_date);
                    if (!reportDate) return false;

                    return isWithinInterval(reportDate, {
                        start: startOfDay(currentRange.startDate),
                        end: endOfDay(currentRange.endDate)
                    });
                });

                if (filteredReports.length > 0) {
                    console.log("Mostrando reportes existentes para el rango");
                    // Mostrar el reporte más reciente del rango
                    const latestReport = filteredReports[0];
                    setCurrentReport(latestReport);
                    return;
                } else {
                    setNoReportMessage(`No hay reportes disponibles para el período seleccionado (${format(currentRange.startDate, 'dd/MM/yyyy')} - ${format(currentRange.endDate, 'dd/MM/yyyy')})`);
                    setCurrentReport(null);
                    return;
                }
            }

            // SOLO generar nuevo reporte si se solicita explícitamente
            console.log("Generando nuevo reporte de rango");
            const payload = {
                report_type: currentReportType,
                include_orders_detail: true
            };

            if (currentReportType === 'weekly') {
                payload.start_date = format(startOfWeek(currentRange.startDate, { locale: es }), 'yyyy-MM-dd');
                payload.end_date = format(endOfWeek(currentRange.startDate, { locale: es }), 'yyyy-MM-dd');
            } else if (currentReportType === 'monthly') {
                payload.year = currentRange.startDate.getFullYear();
                payload.month = currentRange.startDate.getMonth() + 1;
            } else if (currentReportType === 'custom') {
                payload.report_type = 'range';
                payload.start_date = startDate;
                payload.end_date = endDate;
            }

            const response = await api.post('/api/pos/daily-summaries/get_report/', payload, {
                baseURL: getFastFoodBaseURL(),
                timeout: 15000
            });

            const newReport = response.data.data || response.data;
            setCurrentReport(newReport);

        } catch (err) {
            console.error('Error generating report (range):', err);

            let errorMessage = 'Error al generar reporte de rango.';
            if (err.response) {
                if (err.response.status === 500) {
                    errorMessage = `Error interno del servidor: ${err.response.data?.error || 'Revisa logs de Django.'}`;
                } else if (err.response.data?.detail) {
                    errorMessage = `${err.response.data.detail}`;
                }
            } else if (err.message) {
                errorMessage = `${err.message}`;
            }

            setConnectionError(true);
            setError(errorMessage);

        } finally {
            setLoadingData(false);
        }
    }, [reports, loadDailyReport]);


    // Hook de inicialización
    useEffect(() => {
        const initializeReports = async () => {
            setLoading(true);
            try {
                console.log('Inicializando reportes - Fecha local:', new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }));

                await fetchDashboardStats();
                const fetchedReports = await fetchReports();
                setConnectionError(false);

                // Inicialmente cargar el reporte de hoy si existe
                const today = getEcuadorDate();
                console.log('Fecha de hoy (cliente):', today.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }));

                const todayStr = format(today, 'yyyy-MM-dd');
                const todayReport = (fetchedReports || []).find(r => {
                    const reportDate = r.date || r.start_date;
                    // Fix UTC date string comparison
                    if (!reportDate) return false;

                    // Si reportDate es "YYYY-MM-DD", aseguramos comparación local
                    if (reportDate.length === 10) {
                        return reportDate === todayStr;
                    }
                    return isSameLocalDate(reportDate, todayStr);
                });

                console.log('Reporte de hoy encontrado:', todayReport ? 'Sí' : 'No');

                if (todayReport) {
                    setCurrentReport(todayReport);
                    setFilterType('today');
                    if (todayReport.date) {
                        fetchDayShifts(todayReport.date).catch(e => console.warn("Error init shifts:", e));
                    }
                } else {
                    setNoReportMessage('No hay reporte disponible para hoy. Puedes generar uno si es necesario.');
                }

            } catch (err) {
                console.error('Error inicializando reportes:', err);
                setConnectionError(true);
                setError('Error al conectar con el backend. Verifica que el servicio fast-food-service esté ejecutándose y migrado.');
                setDebugInfo(`Error: ${err.message}\nURL: ${getFastFoodBaseURL()}\nStatus: ${err.response?.status}`);
            } finally {
                setLoading(false);
            }
        };

        initializeReports();
    }, [fetchDashboardStats, fetchReports, fetchDayShifts]);

    // closeDay removed as unused

    // ========== FUNCIÓN MODIFICADA: SOLO FILTRA, NO CREA ==========
    const applyQuickFilter = (filter) => {
        setFilterType(filter);
        setNoReportMessage('');
        const today = getEcuadorDate();
        let newRange = { startDate: today, endDate: today };
        let newReportType = 'daily';

        switch (filter) {
            case 'today':
                newReportType = 'daily';
                newRange = { startDate: today, endDate: today };
                // Solo cargar reporte existente, no generar nuevo
                loadDailyReport(today, false);
                break;
            case 'yesterday':
                const yesterday = subDays(today, 1);
                newReportType = 'daily';
                newRange = { startDate: yesterday, endDate: yesterday };
                // Solo cargar reporte existente, no generar nuevo
                loadDailyReport(yesterday, false);
                break;
            case 'thisWeek':
                newReportType = 'weekly';
                newRange = {
                    startDate: startOfWeek(today, { locale: es }),
                    endDate: today
                };
                // Solo filtrar reportes existentes
                generateReport(newReportType, newRange, false);
                break;
            case 'lastWeek':
                newReportType = 'weekly';
                const lastWeekStart = subDays(startOfWeek(today, { locale: es }), 7);
                const lastWeekEnd = subDays(endOfWeek(today, { locale: es }), 7);
                newRange = {
                    startDate: lastWeekStart,
                    endDate: lastWeekEnd
                };
                // Solo filtrar reportes existentes
                generateReport(newReportType, newRange, false);
                break;
            case 'thisMonth':
                newReportType = 'monthly';
                newRange = {
                    startDate: startOfMonth(today),
                    endDate: today
                };
                // Solo filtrar reportes existentes
                generateReport(newReportType, newRange, false);
                break;
            default:
                newReportType = 'daily';
                newRange = { startDate: today, endDate: today };
                loadDailyReport(today, false);
        }

        setReportType(newReportType);
        setDateRange(newRange);
    };

    // fetchShifts removed as unused
    // =================================================

    // forceGenerateReport removed as unused

    // ========== REFRESCAMIENTO SILENCIOSO DE DATOS (POLLING) ==========
    const refreshCurrentData = useCallback(async () => {
        if (!currentReport) return;

        try {
            // 1. Si es REPORTE DE TURNO
            if (currentReport.is_shift_report && currentReport.shift_info?.id) {
                const response = await api.get(`/api/pos/shifts/${currentReport.shift_info.id}/report/`, {
                    baseURL: getFastFoodBaseURL()
                });
                const shiftData = response.data;
                const normalizedReport = {
                    ...shiftData.summary,
                    shift_info: shiftData.shift_info,
                    orders_detail: shiftData.orders_detail,
                    payment_methods: shiftData.payment_methods,
                    top_products: shiftData.top_products,
                    date: shiftData.shift_info.opened_at,
                    is_shift_report: true,
                    generated_by: shiftData.shift_info.user
                };
                setCurrentReport(normalizedReport);
            }
            // 2. Si es REPORTE DIARIO (y estamos visualizando detalle)
            else if (currentReport.date && !currentReport.start_date) {
                const dateStr = currentReport.date;
                // Re-generar reporte detallado sin loading
                const response = await api.post('/api/pos/daily-summaries/generate/', {
                    date: dateStr,
                    detailed: true,
                    include_orders_detail: true
                }, {
                    baseURL: getFastFoodBaseURL()
                });

                // FIX: El backend devuelve { message: "...", summary: { ... } }
                const responseData = response.data.data || response.data;
                const newData = responseData.summary || responseData;

                if (newData) {
                    setCurrentReport(newData);
                    // También actualizar turnos del día si aplica
                    fetchDayShifts(dateStr).catch(e => console.warn(e));
                }
            }
            // 3. Si es RANGO (Custom/Semanal/Mensual) - Opcional, pero bueno tenerlo
            else if (currentReport.start_date && currentReport.end_date) {
                // Para rangos es más pesado, tal vez solo actualizar si el usuario lo pide
                // o usar la misma logica de generateReport pero sin loading.
                // Por ahora lo dejamos para no sobrecargar en rangos grandes.
            }

        } catch (err) {
            console.warn('Error en refrescamiento silencioso:', err);
        }
    }, [currentReport, fetchDayShifts]);

    // POLLING: Actualización en tiempo real (cada 5s)
    useEffect(() => {
        // Carga inicial inmediata
        checkCurrentShift();
        fetchReports();
        fetchDashboardStats();

        const interval = setInterval(() => {
            console.log('🔄 Actualizando datos en tiempo real...');
            checkCurrentShift().catch(e => console.warn('Shift poll error', e));
            fetchDashboardStats().catch(e => console.warn('Dashboard poll error', e)); // Actualizar tarjetas superiores
            fetchReports().catch(e => console.warn('Reports poll error', e));        // Actualizar lista lateral
            refreshCurrentData().catch(e => console.warn('Data poll error', e));  // Actualizar detalle central
        }, 5000); // 5 segundos para mejor sensación de tiempo real

        return () => clearInterval(interval);
    }, [checkCurrentShift, fetchReports, fetchDashboardStats, refreshCurrentData]);

    // --- Funciones de Renderizado ---

    // Renderizar estadísticas de dashboard
    const renderDashboardStats = () => {
        if (!dashboardStats && connectionError) {
            return (
                <div className="card alert-card">
                    <h3 style={{ marginBottom: 15, color: '#dc2626' }}>No se pudo conectar al backend</h3>
                    <p style={{ color: '#666', marginBottom: 10 }}>
                        URL del backend: <strong>{getFastFoodBaseURL()}</strong>
                    </p>
                    <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 15 }}>
                        Para ver reportes reales, verifica que el servicio fast-food-service esté corriendo.
                    </p>

                    <button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                await fetchDashboardStats();
                                await fetchReports();
                                setConnectionError(false);
                            } catch (err) {
                                console.error('Error reconectando:', err);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="action-button primary"
                    >
                        Reintentar Conexión
                    </button>

                    {debugInfo && (
                        <div className="debug-info">
                            <strong>Información de depuración:</strong>
                            <pre>{debugInfo}</pre>
                        </div>
                    )}
                </div>
            );
        }

        if (!dashboardStats) return null;

        const isDayClosed = currentReport?.is_closed;

        return (
            <div className="dashboard-stats card">
                <h3 className="panel-title">Resumen del Día</h3>

                <div className="stats-grid">
                    <div className="stat-item">
                        <p className="stat-label">Ventas Hoy</p>
                        <h4 className="stat-value sales-color">
                            {formatCurrency(dashboardStats.sales?.today || dashboardStats.total_sales || 0)}
                        </h4>
                        {dashboardStats.sales?.change_percentage !== undefined && (
                            <p className={`stat-trend ${dashboardStats.sales?.trend === 'up' ? 'up' : 'down'}`}>
                                {dashboardStats.sales?.trend === 'up' ? '↗' : dashboardStats.sales?.trend === 'down' ? '↘' : '→'}
                                {Math.abs(dashboardStats.sales?.change_percentage || 0).toFixed(1)}% vs ayer
                            </p>
                        )}
                    </div>

                    <div className="stat-item">
                        <p className="stat-label">Órdenes Hoy</p>
                        <h4 className="stat-value order-color">
                            {(dashboardStats.orders?.today || dashboardStats.total_orders || 0).toLocaleString()}
                        </h4>
                    </div>

                    {/* OCULTAR TURNO ACTIVO SI EL DÍA ESTÁ CERRADO */}
                    {!isDayClosed && (
                        <div className="stat-item">
                            <p className="stat-label">Turnos Activos</p>
                            <h4 className="stat-value shift-color">
                                {dashboardStats.shifts?.active || 0}
                            </h4>
                        </div>
                    )}

                    <div className="stat-item">
                        <p className="stat-label">Estado del Día</p>
                        <h4 className={`stat-value ${isDayClosed ? 'closed-color' : 'open-color'}`}>
                            {isDayClosed ? 'Cerrado' : 'Abierto'}
                        </h4>
                    </div>
                </div>
            </div>
        );
    };

    // Renderizar métricas principales
    const renderMetrics = () => {
        if (!currentReport) return null;

        const metrics = [
            {
                title: 'Ventas Totales',
                value: formatCurrency(currentReport.total_sales || 0),
                color: COLORS[0],
                icon: 'monetization_on',
                description: `Promedio: ${formatCurrency(currentReport.average_order_value || 0)}`
            },
            {
                title: 'Órdenes',
                value: (currentReport.total_orders || 0).toLocaleString(),
                color: COLORS[1],
                icon: 'receipt_long',
                description: `Items/orden: ${(currentReport.average_items_per_order || 0).toFixed(1)}`
            },
            {
                title: 'Productos (Unidades)',
                value: (currentReport.total_items_sold || 0).toLocaleString(),
                color: COLORS[2],
                icon: 'shopping_cart',
                description: 'Total de unidades vendidas'
            },
            {
                title: 'Clientes',
                value: (currentReport.total_customers || 0).toLocaleString(),
                color: COLORS[3],
                icon: 'group',
                description: 'Clientes únicos registrados'
            },
            {
                title: 'Descuentos',
                value: formatCurrency(currentReport.total_discounts || 0),
                color: COLORS[4],
                icon: 'discount',
                description: 'Total aplicado'
            },
            {
                title: 'Propinas',
                value: formatCurrency(currentReport.total_tips || 0),
                color: COLORS[6],
                icon: 'attach_money',
                description: 'Propinas recibidas'
            },
        ];

        return (
            <div className="metrics-grid">
                {metrics.map((metric, index) => (
                    <div key={index} className="metric-card">
                        <div className="metric-header">
                            <span className="material-icons" style={{ color: metric.color }}>{metric.icon}</span>
                            <p className="metric-title">{metric.title}</p>
                        </div>
                        <h3 className="metric-value" style={{ color: metric.color }}>
                            {metric.value}
                        </h3>
                        {metric.description && (
                            <p className="metric-description">
                                {metric.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Renderizar gráfico de ventas por hora
    const renderSalesByHourChart = () => {
        if (!currentReport?.sales_by_hour || !Array.isArray(currentReport.sales_by_hour) || currentReport.sales_by_hour.length === 0) {
            return <div className="no-data-chart">No hay datos de ventas por hora disponibles.</div>;
        }
        const hourData = currentReport.sales_by_hour
            .filter(item => item && item.total_sales !== undefined)
            .map(item => ({
                hora: item.hour_label || `${item.hour}:00`,
                ventas: parseFloat(item.total_sales || 0),
            }))
            .sort((a, b) => parseInt(a.hora.split(':')[0]) - parseInt(b.hora.split(':')[0]));

        return (
            <div className="chart-container">
                <h4 className="chart-title">Ventas por Hora (MXN)</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={hourData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="hora" style={{ fontSize: '10px' }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value).replace('$', '')} style={{ fontSize: '10px' }} />
                        <Tooltip
                            formatter={(value, name) => [formatCurrency(value), 'Ventas']}
                            labelFormatter={(label) => `Hora: ${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="ventas"
                            stroke={COLORS[0]}
                            fill={COLORS[0]}
                            fillOpacity={0.2}
                            name="Ventas"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Renderizar gráfico de productos más vendidos
    const renderTopProductsChart = () => {
        if (!currentReport?.top_products || !Array.isArray(currentReport.top_products) || currentReport.top_products.length === 0) {
            return <div className="no-data-chart">No hay datos de productos vendidos.</div>;
        }

        const productData = currentReport.top_products
            .filter(item => item && (item.quantity || item.quantity_sold || 0) > 0)
            .map((item, index) => ({
                name: item.product_name?.substring(0, 25) + (item.product_name?.length > 25 ? '...' : '') || `Producto ${index + 1}`,
                cantidad: item.quantity || item.quantity_sold || 0,
            }));

        return (
            <div className="chart-container">
                <h4 className="chart-title">Listado Completo de Productos Vendidos</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} style={{ fontSize: '10px' }} />
                        <YAxis style={{ fontSize: '10px' }} />
                        <Tooltip
                            formatter={(value) => [value, 'Cantidad Vendida']}
                            labelFormatter={(label) => `Producto: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="cantidad" name="Cantidad" fill={COLORS[1]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Función para manejar la impresión a PDF
    const handlePrintPDF = () => {
        if (!currentReport) {
            alert('No hay reporte seleccionado para imprimir.');
            return;
        }

        const start = formatDate(currentReport.date || currentReport.start_date);
        const end = currentReport.end_date && currentReport.date !== currentReport.end_date ? formatDate(currentReport.end_date) : '';
        const rangeStr = end ? `${start} - ${end}` : start;
        const typeStr = reportType === 'daily' ? 'Diario' : reportType === 'weekly' ? 'Semanal' : reportType === 'monthly' ? 'Mensual' : 'Personalizado';

        generateDetailedPDF(currentReport, typeStr, rangeStr);
    };

    // renderDetailedOrdersTable removed as unused


    if (loading) {
        return <div className="loading-screen">Cargando datos iniciales...</div>;
    }


    return (
        <div className="reportes-container">
            {/* Título principal */}
            <div className="header-bar">
                <div>
                    <h1 className="main-title">Reportes del Sistema</h1>
                    <p className="subtitle">Datos en tiempo real desde la base de datos.</p>
                </div>
                <div className="actions-group">
                    <button
                        onClick={() => {
                            setLoading(true);
                            // Forzar recarga completa de datos
                            Promise.all([
                                fetchDashboardStats(),
                                fetchReports(),
                                checkCurrentShift()
                            ]).finally(() => setLoading(false));
                        }}
                        className="action-button secondary"
                        title="Recargar todos los datos"
                    >
                        <span className="material-icons">refresh</span>
                        Actualizar Datos
                    </button>
                </div>
            </div>

            {/* Alertas de error */}
            {error && <div className="alert warning-alert" style={{ marginBottom: '20px' }}>{error}</div>}
            {loadingData && <div className="alert notes-alert" style={{ marginBottom: '20px' }}>Actualizando datos...</div>}

            {/* ========== GESTIÓN DE TURNOS (NUEVO) ========== */}
            <div className="card" style={{ backgroundColor: 'var(--color-creme)', borderColor: 'var(--color-cinna)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', color: 'var(--color-dark)', fontSize: '1.2rem', fontFamily: 'var(--font-serif)' }}>
                            Gestión de Turno
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-latte)' }}>
                            {currentShift
                                ? <span>Turno: <strong>#{currentShift.shift_number}</strong> | Usuario: {currentShift.user_name || 'Usuario'} | Inicio: {new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | <strong style={{ color: 'var(--color-dark)' }}>Ventas: {formatCurrency(currentShift.total_sales || 0)}</strong></span>
                                : <span style={{ color: 'var(--color-dark)', fontWeight: 'bold' }}>⚠️ No hay turno abierto. Las ventas no se registrarán correctamente.</span>}
                        </p>
                    </div>
                    <div>
                        {currentShift ? (
                            <button
                                onClick={handleCloseShift}
                                disabled={processingShift}
                                style={{
                                    backgroundColor: 'var(--color-dark)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '2px', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '1px'
                                }}
                            >
                                <span className="material-icons">lock_clock</span>
                                {processingShift ? 'Procesando...' : 'Cerrar Turno'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowShiftModal(true)}
                                disabled={processingShift}
                                style={{
                                    backgroundColor: 'var(--color-cinna)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '2px', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '1px'
                                }}
                            >
                                <span className="material-icons">access_time</span>
                                Abrir Nuevo Turno
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            {renderDashboardStats()}

            {/* Panel de Control */}
            <div className="control-panel card">
                <h3 className="panel-title">Filtros y Generación</h3>

                <div className="filter-group">
                    {/* Select Tipo de Reporte */}
                    <div className="filter-item">
                        <label className="filter-label">Tipo de Reporte</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="form-select"
                        >
                            <option value="daily">Diario</option>
                            <option value="shift">Por Turno</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensual</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    {/* Selector de Fechas */}
                    <div className="filter-item">
                        <label className="filter-label">
                            {reportType === 'custom' ? 'Rango de Fechas' : 'Fecha'}
                        </label>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <DatePicker
                                selected={dateRange.startDate}
                                onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                                dateFormat="dd/MM/yyyy"
                                locale={es}
                                className="date-picker-input"
                                wrapperClassName="date-picker"
                            />

                            {reportType === 'custom' && (
                                <>
                                    <span style={{ color: '#666' }}>a</span>
                                    <DatePicker
                                        selected={dateRange.endDate}
                                        onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                                        dateFormat="dd/MM/yyyy"
                                        locale={es}
                                        className="date-picker-input"
                                        wrapperClassName="date-picker"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Botón Generar Reporte - ELIMINADO */}
                </div>

                {/* Filtros Rápidos */}
                <div style={{ marginTop: 25 }}>
                    <label className="filter-label">Filtros Rápidos</label>
                    <div className="quick-filters">
                        {['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => applyQuickFilter(filter)}
                                disabled={connectionError}
                                className={`quick-filter-button ${filterType === filter ? 'active' : ''}`}
                            >
                                {filter === 'today' && 'Hoy'}
                                {filter === 'yesterday' && 'Ayer'}
                                {filter === 'thisWeek' && 'Esta Semana'}
                                {filter === 'lastWeek' && 'Semana Pasada'}
                                {filter === 'thisMonth' && 'Este Mes'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="content-layout">
                {/* Lista de Reportes - SIDEBAR MEJORADO CON CAMPOS DE CLIENTE */}
                <div className="reports-list-panel card">
                    <div className="panel-header">
                        <h3 className="panel-title">Reportes Recientes ({reports.length})</h3>
                        <button
                            onClick={() => fetchReports()}
                            disabled={connectionError}
                            className="refresh-button"
                        >
                            Actualizar
                        </button>
                    </div>

                    <div className="reports-scroll">
                        {reports.length === 0 ? (
                            <div className="no-reports">No hay reportes generados.</div>
                        ) : (
                            <div className="reports-item-list">
                                {reports.slice(0, 20).map((report, index) => {
                                    // Lógica de renderizado diferenciada para Turnos vs Reportes Diarios
                                    const isShiftItem = report.shift_number !== undefined;

                                    let reportDate, displayDate, itemId, isClosed, totalSales, totalOrders, labelTitle;

                                    if (isShiftItem) {
                                        reportDate = report.opened_at;
                                        displayDate = `${formatDate(report.opened_at)} ${format(new Date(report.opened_at), 'HH:mm')}`;
                                        itemId = report.id;
                                        isClosed = report.status === 'closed';
                                        totalSales = report.total_sales;
                                        totalOrders = report.total_transactions; // Shift model uses total_transactions
                                        labelTitle = `Turno ${report.shift_number}`;
                                    } else {
                                        reportDate = report.date || report.start_date;
                                        displayDate = formatDate(reportDate);
                                        itemId = report.id;
                                        isClosed = report.is_closed;
                                        totalSales = report.total_sales;
                                        totalOrders = report.total_orders;
                                        labelTitle = displayDate;
                                    }

                                    const isSelected = currentReport?.id === itemId ||
                                        (!isShiftItem && currentReport?.date === reportDate && !currentReport?.id && !report.id);

                                    return (
                                        <div
                                            key={itemId || index}
                                            onClick={() => {
                                                if (itemId) {
                                                    verDetalleReporte(itemId, isShiftItem);
                                                } else if (!isShiftItem) {
                                                    const reportDateObj = getValidDate(reportDate);
                                                    if (reportDateObj) {
                                                        loadDailyReport(reportDateObj, false);
                                                    }
                                                }
                                            }}
                                            className={`report-item ${isSelected ? 'selected' : ''}`}
                                            style={{ padding: '15px' }}
                                        >
                                            <div className="item-content">
                                                <div className="item-status" style={{ marginBottom: '10px' }}>
                                                    <h4 className="item-date" style={{ fontSize: '1.1rem', margin: 0 }}>{labelTitle}</h4>
                                                    {isClosed ? (
                                                        <span className="status-badge closed-badge" style={{ fontSize: '0.7rem' }}>CERRADO</span>
                                                    ) : (
                                                        <span className="status-badge open-badge" style={{ fontSize: '0.7rem' }}>ABIERTO</span>
                                                    )}
                                                </div>

                                                <div className="item-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div className="metric-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                                        <span className="metric-label" style={{ fontSize: '0.8rem' }}>Ventas Totales</span>
                                                        <strong className="metric-value sales-color" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalSales || 0)}</strong>
                                                    </div>
                                                    <div className="metric-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                                        <span className="metric-label" style={{ fontSize: '0.8rem' }}>Órdenes</span>
                                                        <span className="metric-text" style={{ fontSize: '1.1rem' }}>{(totalOrders || 0).toLocaleString()}</span>
                                                    </div>
                                                    {!isShiftItem && (
                                                        <div className="metric-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                                            <span className="metric-label" style={{ fontSize: '0.8rem' }}>Clientes</span>
                                                            <span className="metric-text" style={{ fontSize: '1.1rem' }}>{(report.total_customers || 0).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detalle del Reporte */}
                <div className="report-detail-panel card">
                    {currentReport ? (
                        <>
                            {/* Header del Reporte */}
                            <div className="detail-header">
                                <div>
                                    <h2 className="detail-title">Reporte {reportType === 'daily' ? 'Diario' : reportType === 'weekly' ? 'Semanal' : reportType === 'monthly' ? 'Mensual' : 'Personalizado'}</h2>
                                    <div className="detail-metadata">
                                        <span className="metadata-item">Fecha: {formatDate(currentReport.date || currentReport.start_date)}
                                            {currentReport.end_date && currentReport.date !== currentReport.end_date && currentReport.start_date !== currentReport.end_date &&
                                                ` - ${formatDate(currentReport.end_date)}`}
                                        </span>
                                        <span className="metadata-item">Usuario: {currentReport.generated_by || 'Sistema'}</span>
                                    </div>
                                </div>
                                <div className="detail-status">
                                    <div className={`status-pill ${currentReport.is_closed ? 'closed-pill' : 'open-pill'}`}>
                                        {currentReport.is_closed ? 'DÍA CERRADO' : 'DÍA ABIERTO'}
                                    </div>
                                    <p className="generation-date">Actualizado: {formatDate(currentReport.generated_at || new Date().toISOString())}</p>
                                </div>
                            </div>

                            {/* Alerta de Conexión */}
                            {connectionError && (
                                <div className="alert warning-alert">
                                    <h4 className="alert-title">Nota importante</h4>
                                    <p>Estás viendo datos incompletos. Soluciona el error en el backend para ver datos en tiempo real y gráficos.</p>
                                </div>
                            )}

                            {/* Desglose de Turnos (NUEVO) */}
                            <h3 className="section-title chart-section" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Desglose de Turnos</span>
                                <button
                                    className="action-button primary"
                                    onClick={handlePrintPDF}
                                    style={{ fontSize: '0.9rem', padding: '8px 15px' }}
                                >
                                    <span className="material-icons" style={{ fontSize: '1.1rem', marginRight: '5px' }}>print</span>
                                    Imprimir Reporte del Día
                                </button>
                            </h3>
                            <div className="card" style={{ padding: '15px', marginBottom: '20px' }}>
                                {dayShifts && dayShifts.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {dayShifts.map((shift, idx) => (
                                            <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>Turno #{shift.shift_number} - {shift.user_name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                        {format(new Date(shift.opened_at), 'HH:mm')} - {shift.closed_at ? format(new Date(shift.closed_at), 'HH:mm') : 'En curso'}
                                                        <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#059669' }}>
                                                            Ventas: {formatCurrency(shift.total_sales || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handlePrintShiftReport(shift.id)}
                                                    className="action-button secondary"
                                                    style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                >
                                                    <span className="material-icons" style={{ fontSize: '1rem', marginRight: '5px' }}>picture_as_pdf</span>
                                                    PDF
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#666', fontStyle: 'italic' }}>No hay turnos registrados para este día.</p>
                                )}
                            </div>

                            {/* Métricas Principales */}
                            <h3 className="section-title">Métricas de Rendimiento</h3>
                            {renderMetrics()}

                            {/* ELIMINADO: Detalle de Órdenes (Web) */}

                            {/* Gráficos Restantes (Ventas por Hora y Top Productos) */}
                            <h3 className="section-title chart-section" style={{ marginTop: '40px' }}>Análisis de Gráficos</h3>

                            <div className="charts-grid">
                                {renderSalesByHourChart()}
                                {renderTopProductsChart()}
                            </div>

                            {/* Notas Adicionales */}
                            {currentReport.closing_notes && (
                                <div className="alert notes-alert">
                                    <h4 className="alert-title">Notas de Cierre</h4>
                                    <p>{currentReport.closing_notes}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <span className="material-icons" style={{ fontSize: '4rem', color: '#ccc' }}>assessment</span>
                            <h3 className="empty-title">
                                {noReportMessage || 'Selecciona un reporte'}
                            </h3>
                            <p className="empty-message">
                                {noReportMessage
                                    ? 'Puedes generar un nuevo reporte usando el botón "Generar Nuevo Reporte"'
                                    : 'Haz clic en un reporte de la lista para ver su información detallada, métricas y gráficos de análisis.'}
                            </p>
                            <button
                                onClick={() => applyQuickFilter('today')}
                                disabled={connectionError}
                                className="action-button primary"
                            >
                                {connectionError ? 'Error de Conexión' : 'Ver Reporte de Hoy'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== MODAL PARA DETALLE COMPLETO ========== */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Detalle Completo del Reporte</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {modalLoading ? (
                                <div className="loading-spinner">Cargando detalles...</div>
                            ) : (
                                <>
                                    <div className="modal-summary-grid">
                                        <div className="modal-stat">
                                            <span>Ventas Totales:</span>
                                            <strong>{formatCurrency(currentReport?.total_sales)}</strong>
                                        </div>
                                        <div className="modal-stat">
                                            <span>Órdenes Totales:</span>
                                            <strong>{currentReport?.total_orders}</strong>
                                        </div>
                                        <div className="info-item">
                                            <span className="material-icons">paid</span>
                                            <span>Ventas: <strong>{formatCurrency(currentShift?.total_sales || 0)}</strong></span>
                                        </div>
                                        <div className="modal-stat">
                                            <span>Promedio/Orden:</span>
                                            <strong>{formatCurrency(currentReport?.average_order_value)}</strong>
                                        </div>
                                    </div>

                                    {/* Desglose de Turnos EN MODAL (NUEVO REQUERIMIENTO) */}
                                    <h3 className="section-title detail-section" style={{ marginTop: '20px' }}>Desglose de Turnos del Día</h3>
                                    <div className="card" style={{ padding: '15px', marginBottom: '20px', border: '1px solid #eee' }}>
                                        {dayShifts && dayShifts.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {dayShifts.map((shift, idx) => (
                                                    <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>Turno #{shift.shift_number} - {shift.user_name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                                {format(new Date(shift.opened_at), 'HH:mm')} - {shift.closed_at ? format(new Date(shift.closed_at), 'HH:mm') : 'En curso'}
                                                                <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#059669' }}>
                                                                    Ventas: {formatCurrency(shift.total_sales || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handlePrintShiftReport(shift.id)}
                                                            className="action-button secondary"
                                                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                        >
                                                            <span className="material-icons" style={{ fontSize: '1rem', marginRight: '5px' }}>picture_as_pdf</span>
                                                            PDF
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#666', fontStyle: 'italic' }}>No hay turnos registrados para este día.</p>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '20px' }}>
                                        <h4 className="section-title chart-section">Análisis de Gráficos</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <h4 className="chart-title">Ventas por Hora</h4>
                                                {renderSalesByHourChart()}
                                            </div>
                                            <div>
                                                <h4 className="chart-title">Productos Vendidos</h4>
                                                {renderTopProductsChart()}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="action-button" onClick={() => setShowModal(false)}>Cerrar</button>
                            <button className="action-button primary" onClick={handlePrintPDF}>Imprimir Reporte Completo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODAL PARA ABRIR TURNO ========== */}
            {showShiftModal && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ maxWidth: '400px', height: 'auto' }}>
                        <div className="modal-header">
                            <h2>Abrir Nuevo Turno</h2>
                            <button className="close-button" onClick={() => setShowShiftModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleOpenShift}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Nombre del Encargado:</label>
                                    <input
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Notas (Opcional):</label>
                                    <textarea
                                        value={shiftNotes}
                                        onChange={(e) => setShiftNotes(e.target.value)}
                                        placeholder="Observaciones iniciales..."
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '80px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowShiftModal(false)}
                                        style={{ padding: '10px 15px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', background: 'white' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingShift}
                                        style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#059669', color: 'white', fontWeight: 'bold' }}
                                    >
                                        {processingShift ? 'Abriendo...' : 'Abrir Turno'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Estilos CSS Globales - BOUTIQUE ELEGANCE */}
            <style>{`
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
                
                :root {
                    /* Boutique Palette */
                    --color-cinna: #CFB3A9;
                    --color-creme: #F5F5F0;
                    --color-latte: #A09086;
                    --color-chai: #E4D8CB;
                    --color-dark: #2C2C2C;
                    --color-white: #FFFFFF;
                    --color-froth: #F1EEEB;
                    
                    /* Theme Mapping */
                    --primary: var(--color-cinna);
                    --secondary: var(--color-latte);
                    --success: #6c8c50; /* Muted olive */
                    --danger: #d97b7b; /* Muted red */
                    --warning: #e0b084;
                    --background-light: var(--color-froth);
                    --card-bg: var(--color-white);
                    --text-dark: var(--color-dark);
                    --text-muted: var(--color-latte);
                    --border-color: var(--color-chai);
                    
                    --font-serif: 'Cinzel', serif;
                    --font-sans: 'Lato', sans-serif;
                }
                
                .reportes-container {
                    padding: 30px;
                    max-width: 1600px;
                    margin: 0 auto;
                    font-family: var(--font-sans);
                    color: var(--text-dark);
                }

                .card {
                    background-color: var(--card-bg);
                    padding: 30px;
                    border-radius: 4px; /* Sharper corners */
                    box-shadow: 0 10px 30px rgba(160, 144, 134, 0.1);
                    margin-bottom: 25px;
                    border: 1px solid rgba(228, 216, 203, 0.5);
                }
                
                .alert-card {
                    border: 1px solid var(--danger);
                    background-color: #fff5f5;
                }

                .debug-info {
                    margin-top: 15px;
                    padding: 10px;
                    background-color: var(--color-froth);
                    border-radius: 4px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                /* MODAL */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(44, 44, 44, 0.7);
                    backdrop-filter: blur(5px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-container {
                    background: var(--color-white);
                    width: 95%;
                    max-width: 1200px;
                    max-height: 90vh;
                    border-radius: 4px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.3);
                    border-top: 5px solid var(--color-cinna);
                }
                .modal-header {
                    padding: 25px 30px;
                    background: var(--color-white);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h2 {
                    margin: 0;
                    color: var(--color-dark);
                    font-family: var(--font-serif);
                    font-size: 1.8rem;
                }
                .modal-body {
                    padding: 30px;
                    overflow-y: auto;
                    flex: 1;
                    background: var(--color-froth);
                    font-family: var(--font-sans);
                }
                .modal-footer {
                    padding: 20px 30px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    background: var(--color-white);
                }
                .close-button {
                    font-size: 2rem;
                    border: none;
                    background: none;
                    cursor: pointer;
                    color: var(--color-latte);
                    transition: color 0.2s;
                }
                .close-button:hover {
                    color: var(--color-dark);
                }
                
                .modal-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                    background: var(--color-white);
                    padding: 25px;
                    border-radius: 4px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.03);
                }
                .modal-stat {
                    display: flex;
                    flex-direction: column;
                    padding: 15px;
                    background: var(--color-froth);
                    border-left: 3px solid var(--color-cinna);
                }
                .modal-stat span {
                    font-size: 0.8rem;
                    color: var(--color-latte);
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .modal-stat strong {
                    font-family: var(--font-serif);
                    font-size: 1.4rem;
                    color: var(--color-dark);
                }

                /* HEADERS */
                .header-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--border-color);
                }
                .main-title {
                    margin: 0;
                    color: var(--color-dark);
                    font-family: var(--font-serif);
                    font-size: 2.2rem;
                }
                .subtitle {
                    margin: 5px 0 0 0;
                    color: var(--color-latte);
                    font-family: var(--font-sans);
                    font-size: 1rem;
                }

                /* CONTROLS & BUTTONS */
                .action-button {
                    padding: 10px 25px;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.85rem;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-family: var(--font-sans);
                }
                .action-button.primary {
                    background-color: var(--color-cinna);
                    color: white;
                    box-shadow: 0 4px 10px rgba(207, 179, 169, 0.4);
                }
                .action-button.primary:hover {
                    background-color: var(--color-dark);
                    transform: translateY(-2px);
                }
                .action-button.secondary {
                    background-color: transparent;
                    border: 1px solid var(--color-latte);
                    color: var(--color-latte);
                }
                .action-button.secondary:hover {
                    border-color: var(--color-dark);
                    color: var(--color-dark);
                }

                .control-panel .panel-title {
                    color: var(--color-dark);
                    margin-bottom: 25px;
                    border-bottom: 1px solid var(--color-chai);
                    padding-bottom: 15px;
                    font-family: var(--font-serif);
                    font-size: 1.4rem;
                }

                .filter-group {
                    display: flex;
                    gap: 30px;
                    align-items: flex-end;
                    flex-wrap: wrap;
                }
                .filter-label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: var(--color-dark);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .form-select, .date-picker-input {
                    padding: 10px 15px;
                    border-radius: 2px;
                    border: 1px solid var(--border-color);
                    width: 100%;
                    font-size: 0.95rem;
                    font-family: var(--font-sans);
                    color: var(--color-dark);
                    background-color: var(--color-white);
                }
                .form-select:focus, .date-picker-input:focus {
                    outline: none;
                    border-color: var(--color-cinna);
                }

                .quick-filters {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-top: 15px;
                }
                .quick-filter-button {
                    padding: 8px 20px;
                    background-color: transparent;
                    color: var(--color-latte);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 500;
                    transition: all 0.3s;
                }
                .quick-filter-button:hover {
                    border-color: var(--color-cinna);
                    color: var(--color-cinna);
                }
                .quick-filter-button.active {
                    background-color: var(--color-cinna);
                    color: white;
                    border-color: var(--color-cinna);
                }

                /* DASHBOARD STATS */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 25px;
                }
                .stat-item {
                    text-align: center;
                    padding: 10px;
                }
                .stat-label {
                    margin: 0 0 10px 0;
                    color: var(--color-latte);
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .stat-value {
                    margin: 0;
                    font-size: 2rem;
                    font-weight: 400;
                    font-family: var(--font-serif);
                    color: var(--color-dark);
                }
                .sales-color { color: var(--color-dark); }
                .order-color { color: var(--color-latte); }
                .shift-color { color: var(--color-cinna); }
                .closed-color { color: var(--danger); font-size: 1.5rem; }
                .open-color { color: var(--success); font-size: 1.5rem; }

                /* CONTENT LAYOUT */
                .content-layout {
                    display: grid;
                    grid-template-columns: 350px 1fr; 
                    gap: 30px;
                    align-items: flex-start;
                    margin-top: 30px;
                }
                
                /* LIST PANEL */
                .reports-list-panel {
                    height: calc(100vh - 150px); 
                    padding: 20px;
                    background: var(--color-white);
                    border-right: 1px solid var(--border-color);
                }
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                }
                .panel-header .panel-title {
                    font-family: var(--font-serif);
                    font-size: 1.1rem;
                    color: var(--color-dark);
                }
                
                .report-item {
                    padding: 20px;
                    border-radius: 4px;
                    border: 1px solid transparent;
                    border-bottom: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: all 0.2s;
                    background-color: transparent;
                }
                .report-item:hover {
                    background-color: var(--color-froth);
                    padding-left: 25px; /* Slide effect */
                }
                .report-item.selected {
                    background-color: var(--color-froth);
                    border-left: 4px solid var(--color-cinna);
                }
                .item-date {
                    font-family: var(--font-serif);
                    color: var(--color-dark);
                    font-size: 1rem;
                }
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 2px;
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .closed-badge { background-color: var(--text-muted); color: white; }
                .open-badge { background-color: var(--color-cinna); color: white; }
                
                /* METRICS GRID */
                .metric-card {
                    padding: 25px;
                    border: 1px solid var(--border-color);
                    box-shadow: none;
                    background: var(--color-white);
                    position: relative;
                }
                .metric-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
                    border-color: var(--color-cinna);
                }
                .metric-title {
                    font-family: var(--font-sans);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 0.75rem;
                }
                .metric-value {
                    font-family: var(--font-serif);
                    font-size: 1.8rem;
                    margin-top: 10px;
                }

                /* CHART CONTAINERS */
                .chart-container {
                    background: var(--color-white);
                    padding: 30px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.02);
                }
                .chart-title {
                    font-family: var(--font-serif);
                    color: var(--color-dark);
                    text-align: center;
                    margin-bottom: 25px;
                }
                
                /* RESPONSIVE */
                @media (max-width: 1200px) {
                    .content-layout { grid-template-columns: 1fr; }
                    .reports-list-panel { height: 400px; margin-bottom: 30px; }
                }
                @media (max-width: 768px) {
                    .header-bar { flex-direction: column; align-items: flex-start; gap: 20px; }
                }
            `}</style>
        </div>
    );
};

export default Reportes;