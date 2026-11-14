/*
  Usuarios que aparecen en el desplegable del inicio de sesión.
  Cada uno corresponde a una cuenta de Supabase Auth (con rol "admin" en app_metadata):
  el inicio de sesión usa el correo por detrás, pero la persona solo elige su nombre.

  Para agregar a alguien:
    1. Crea su cuenta en Supabase → Authentication → Users (correo y contraseña)
       y dale el rol: app_metadata = { "role": "admin" }.
    2. Agrégalo aquí con el nombre que verá en la lista.
*/

export type PanelUser = { label: string; email: string };

export const PANEL_USERS: PanelUser[] = [
  { label: 'Administrador', email: 'sorteo@gmail.com' },
];
