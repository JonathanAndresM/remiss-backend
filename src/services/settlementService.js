import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import WeeklySettlement from '../models/WeeklySettlement.js';
import BalanceTransaction from '../models/BalanceTransaction.js';

/**
 * Cierra la semana para un conductor específico (o todos)
 * @param {ObjectId} driverId - opcional, si no se pasa, procesa todos los conductores con viajes sin liquidar
 */
export const processWeeklySettlement = async (driverId = null) => {
  // Determinar el rango de la semana pasada (lunes a domingo)
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // lunes anterior
  lastMonday.setHours(0, 0, 0, 0);
  
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const filter = {
    status: 'completed',
    completedAt: { $gte: lastMonday, $lte: lastSunday },
    settled: false,
  };
  if (driverId) filter.driver = driverId;

  const rides = await Ride.find(filter).populate('driver');
  if (rides.length === 0) return;

  // Agrupar por conductor
  const ridesByDriver = rides.reduce((acc, ride) => {
    const driverKey = ride.driver.toString();
    if (!acc[driverKey]) acc[driverKey] = { rides: [], driverDoc: ride.driver };
    acc[driverKey].rides.push(ride);
    return acc;
  }, {});

  for (const [driverKey, data] of Object.entries(ridesByDriver)) {
    const driver = await Driver.findById(driverKey);
    if (!driver) continue;

    let totalCash = 0;
    let totalDigital = 0;
    let totalCompanyCommission = 0;
    let driverNet = 0;

    for (const ride of data.rides) {
      if (ride.paymentMethod === 'cash') {
        totalCash += ride.price;
        totalCompanyCommission += ride.companyCommission;
        driverNet -= ride.companyCommission;   // conductor debe pagar comisión
      } else {
        totalDigital += ride.price;
        totalCompanyCommission += ride.companyCommission;
        driverNet += ride.driverEarning;       // empresa debe pagar al conductor
      }
      ride.settled = true;
      await ride.save();
    }

    // Crear el settlement
    const settlement = await WeeklySettlement.create({
      driver: driver._id,
      startDate: lastMonday,
      endDate: lastSunday,
      totalCash,
      totalDigital,
      totalCompanyCommission,
      driverNet,
      settlementStatus: driverNet >= 0 ? 'pending' : 'debt',
    });

    // Registrar ajuste de balance si es necesario? No, porque el balance ya se actualizó en cada viaje.
    // Pero podemos crear una transacción de "cierre semanal" para referencia.
    await BalanceTransaction.create({
      driver: driver._id,
      amount: 0, // solo referencia
      type: 'adjustment',
      description: `Cierre semanal ${lastMonday.toLocaleDateString()} - ${lastSunday.toLocaleDateString()}`,
    });
  }
};

/**
 * Ejecutar pagos a conductores con saldo positivo los martes
 */
export const processWeeklyPayments = async () => {
  const now = new Date();
  // Buscar settlements de la semana pasada que estén pendientes y con driverNet > 0
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const settlements = await WeeklySettlement.find({
    startDate: lastMonday,
    endDate: lastSunday,
    settlementStatus: 'pending',
    driverNet: { $gt: 0 },
  }).populate('driver');

  for (const settlement of settlements) {
    const driver = settlement.driver;
    // Aquí iría la integración con API bancaria para transferir settlement.driverNet a la cuenta del conductor
    console.log(`Transferir $${settlement.driverNet} a la cuenta de ${driver.user.name} (${driver.bankAccount?.accountNumber})`);
    
    // Simulación de transferencia exitosa
    settlement.settlementStatus = 'paid';
    settlement.paymentDate = new Date();
    await settlement.save();

    // Actualizar balance del conductor: restar lo que se le pagó (porque ya no se le debe)
    driver.balance -= settlement.driverNet;
    await driver.save();

    await BalanceTransaction.create({
      driver: driver._id,
      amount: -settlement.driverNet,
      type: 'settlement_payment',
      description: `Pago semanal ${settlement.startDate.toLocaleDateString()} - ${settlement.endDate.toLocaleDateString()}`,
    });
  }
};