import { NextFunction, Request, Response, Router } from 'express';
import { pool } from '../config/database';
import { VacationRepository } from '../repositories/vacation.repository';
import { DiasDisponiblesRepository } from '../repositories/diasDisponibles.repository';
import { FestivosRepository } from '../repositories/festivos.repository';
import { EmailService } from '../services/email.service';
import { VacationService } from '../services/vacation.service';
import { VacationController } from '../controller/vacation.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { createVacationSchema } from '../dtos/create-vacation.dto';
import { rejectVacationSchema } from '../dtos/reject-vacation.dto';
import { createFestivoSchema } from '../dtos/create-festivo.dto';
import { env } from '../config/env';

const router = Router();

const vacationRepo = new VacationRepository(pool);
const diasRepo = new DiasDisponiblesRepository(pool);
const festivosRepo = new FestivosRepository(pool);
const emailService = new EmailService();
const vacationService = new VacationService(vacationRepo, diasRepo, festivosRepo, emailService);
const vacationController = new VacationController(vacationService);

const READ_ROLES  = ['ADMIN', 'HR', 'CONSULTATION'] as const;
const ADMIN_READ_ROLES = ['ADMIN', 'HR'] as const;
const WRITE_ROLES = ['ADMIN', 'HR'] as const;
const ADMIN_ROLES = ['ADMIN'] as const;

function requireConsultantSelfService(_req: Request, res: Response, next: NextFunction): void {
  if (!env.consultantSelfServiceEnabled) {
    res.status(404).json({
      success: false,
      message: 'Consultant self-service is disabled',
    });
    return;
  }
  next();
}

// Festivos — rutas estáticas ANTES de las dinámicas con :id
router.get('/festivos/:anio', authenticate, authorize(...READ_ROLES),  vacationController.getFestivosByAnio);
router.post('/festivos',      authenticate, authorize(...ADMIN_ROLES), validateRequest(createFestivoSchema), vacationController.createFestivo);

// Autoconsulta y solicitud propia del Consultante
router.get('/me/eligibility', authenticate, requireConsultantSelfService, authorize('CONSULTATION'), vacationController.getMyEligibility);
router.get('/me/disponibles', authenticate, requireConsultantSelfService, authorize('CONSULTATION'), vacationController.getMyDiasDisponibles);
router.get('/me',             authenticate, requireConsultantSelfService, authorize('CONSULTATION'), vacationController.getMine);
router.post('/me',            authenticate, requireConsultantSelfService, authorize('CONSULTATION'), validateRequest(createVacationSchema.omit({ empleado_id: true })), vacationController.createMine);

// Consultas por empleado
router.get('/',                        authenticate, authorize(...ADMIN_READ_ROLES),  vacationController.getAll);
router.get('/empleado/:id',             authenticate, authorize(...ADMIN_READ_ROLES),  vacationController.getByEmpleadoId);
router.get('/empleado/:id/disponibles', authenticate, authorize(...ADMIN_READ_ROLES),  vacationController.getDiasDisponibles);

// CRUD de solicitudes
router.post('/',              authenticate, authorize(...WRITE_ROLES), validateRequest(createVacationSchema), vacationController.create);
router.patch('/:id/aprobar',  authenticate, authorize(...WRITE_ROLES), vacationController.aprobar);
router.patch('/:id/rechazar', authenticate, authorize(...WRITE_ROLES), validateRequest(rejectVacationSchema),  vacationController.rechazar);
router.patch('/:id/cancelar', authenticate, authorize(...WRITE_ROLES), vacationController.cancelar);

export default router;
