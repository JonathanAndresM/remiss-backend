import cron from 'node-cron';
import { processWeeklySettlement, processWeeklyPayments } from './services/settlementService.js';
import { processWaitingTransitions } from './services/waitingService.js'

// Ejecutar liquidación los lunes a las 00:05
cron.schedule('5 0 * * 1', async () => {
  console.log('Ejecutando liquidación semanal...');
  await processWeeklySettlement();
});

// Ejecutar pagos los martes a las 10:00 AM
cron.schedule('0 10 * * 2', async () => {
  console.log('Ejecutando pagos semanales...');
  await processWeeklyPayments();
});

// Ejecutar cada minuto
cron.schedule('* * * * *', async () => {
  await processWaitingTransitions();
});