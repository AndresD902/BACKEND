import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ReportService, reportService } from '../services/report.service';
import { registrarAccion } from '../clients/historyClient';
import { asyncHandler } from '../utils/async-handler.util';

export class ReportController {
  constructor(private readonly service: ReportService = reportService) {}

  private token(req: AuthenticatedRequest): string {
    return req.headers.authorization ?? '';
  }

  private audit(req: AuthenticatedRequest, tipoReporte: string): void {
    registrarAccion({
      usuario_email: req.user?.email,
      rol:           req.user?.rol,
      accion:        'reporte_generado',
      resultado:     'exitoso',
      detalle:       tipoReporte,
      ip_origen:     req.ip,
      user_agent:    req.headers['user-agent'],
    });
  }

  // GET /api/reportes/empleado/:id
  public getReporteEmpleado = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const reporte = await this.service.getReporteEmpleado(id, this.token(req));
    this.audit(req, `empleado:${id}`);
    res.status(200).json({ success: true, data: reporte });
  });

  // GET /api/reportes/estado-laboral
  public getEstadoLaboral = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reporte = await this.service.getEstadoLaboral(this.token(req));
    this.audit(req, 'estado_laboral');
    res.status(200).json({ success: true, data: reporte });
  });

  // GET /api/reportes/vacaciones
  public getReporteVacaciones = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const params: Record<string, unknown> = {};
    if (req.query.desde) params['desde'] = String(req.query.desde);
    if (req.query.hasta) params['hasta'] = String(req.query.hasta);
    if (req.query.estado) params['estado'] = String(req.query.estado);
    if (req.query.empleado_id) params['empleado_id'] = String(req.query.empleado_id);
    const reporte = await this.service.getReporteVacaciones(this.token(req), params);
    this.audit(req, 'vacaciones');
    res.status(200).json({ success: true, data: reporte });
  });

  // GET /api/reportes/contratos
  public getReporteContratos = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const params: Record<string, unknown> = {};
    if (req.query.desde) params['desde'] = String(req.query.desde);
    if (req.query.hasta) params['hasta'] = String(req.query.hasta);
    if (req.query.estado) params['estado'] = String(req.query.estado);
    if (req.query.empleado_id) params['empleado_id'] = String(req.query.empleado_id);
    const reporte = await this.service.getReporteContratos(this.token(req), params);
    this.audit(req, 'contratos');
    res.status(200).json({ success: true, data: reporte });
  });

  // GET /api/reportes/turnover
  public getReporteTurnover = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const desde = req.query.desde ? String(req.query.desde) : undefined;
    const hasta  = req.query.hasta  ? String(req.query.hasta)  : undefined;
    const reporte = await this.service.getReporteTurnover(this.token(req), desde, hasta);
    this.audit(req, 'turnover');
    res.status(200).json({ success: true, data: reporte });
  });

  // GET /api/reportes/empleados/csv
  public getEmpleadosCsv = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const csv = await this.service.getEmpleadosCsv(this.token(req));
    const fecha = new Date().toISOString().split('T')[0];
    this.audit(req, 'csv_empleados');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="empleados_${fecha}.csv"`);
    res.status(200).send('﻿' + csv); // BOM for Excel UTF-8 compatibility
  });
}

export const reportController = new ReportController();
