import type { Employee, Site } from './supabase';

type NamedRelation = { name: string } | undefined;

export const getEmployeeSiteName = (employee: Employee, fallback = 'Bureau 1') =>
  (employee.site as NamedRelation)?.name || fallback;

export const getEmployeeDeptName = (employee: Employee) =>
  (employee.department as NamedRelation)?.name;

export const getEmployeeFullName = (employee: Employee) =>
  `${employee.first_name} ${employee.last_name}`.trim();

export const getSiteNames = (sites: Site[], employees: Employee[]) => {
  const fromDb = sites.map(s => s.name);
  const fromEmployees = employees.map(e => getEmployeeSiteName(e));
  return [...new Set([...fromDb, ...fromEmployees])].sort();
};
