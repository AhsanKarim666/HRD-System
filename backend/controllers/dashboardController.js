const db = require('../db');

const getDashboardStats = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [activeEmployees, attendanceStats, pendingLeaves, payrollProjection, recentEmployees] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total_active FROM employees WHERE status = 'Active'`),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'Present') AS present_today,
          COUNT(*) FILTER (WHERE status = 'Late') AS late_today
        FROM attendances
        WHERE date = $1
      `, [today]),
      db.query(`SELECT COUNT(*)::int AS pending_leaves FROM leaves WHERE status = 'Pending'`),
      db.query(`
        SELECT COALESCE(SUM(net_salary), 0)::numeric AS monthly_payroll_projection
        FROM payroll
        WHERE period = $1
      `, [new Date().toISOString().slice(0, 7) + '-01']),
      db.query(`
        SELECT e.id, e.nik, e.full_name, e.hire_date, d.name AS department_name, p.name AS position_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN positions p ON p.id = e.position_id
        ORDER BY e.id DESC
        LIMIT 5
      `),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: Number(activeEmployees.rows[0]?.total_active || 0),
        presentToday: Number(attendanceStats.rows[0]?.present_today || 0),
        lateToday: Number(attendanceStats.rows[0]?.late_today || 0),
        pendingLeaves: Number(pendingLeaves.rows[0]?.pending_leaves || 0),
        payrollProjection: Number(payrollProjection.rows[0]?.monthly_payroll_projection || 0),
        recentEmployees: recentEmployees.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };