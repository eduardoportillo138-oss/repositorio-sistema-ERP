import { config } from '../config/env';
import { Company } from '../models/company.model';
import { User } from '../models/user.model';
import { sendEmail } from './email.service';

interface CreatedUserDetails {
  id: string;
  companyId: string;
  name: string;
  email: string;
  createdAt?: Date;
}

interface UserCreatedNotification {
  createdUser: CreatedUserDetails;
  actorUserId: string;
  roleName: string;
  branchName?: string;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

export async function notifyUserCreated({
  createdUser,
  actorUserId,
  roleName,
  branchName,
}: UserCreatedNotification): Promise<void> {
  if (!config.userCreatedEmailNotifications) return;

  const [company, actor] = await Promise.all([
    Company.findOne({ _id: createdUser.companyId }).select('name').exec(),
    User.findOne({ _id: actorUserId, companyId: createdUser.companyId }).select('name').exec(),
  ]);

  const fields = [
    ['Nombre', createdUser.name],
    ['Correo', createdUser.email],
    ['Empresa', company?.name || createdUser.companyId],
    ...(branchName ? [['Sucursal', branchName]] : []),
    ['Rol', roleName],
    ...(actor?.name ? [['Registrado por', actor.name]] : []),
    ['Fecha', (createdUser.createdAt || new Date()).toISOString()],
  ];
  const text = [
    'Nuevo usuario registrado',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');
  const html = `<h1>Nuevo usuario registrado</h1><dl>${fields
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('')}</dl>`;

  await sendEmail({
    to: config.adminAlertEmail,
    subject: 'Nuevo usuario registrado en ERP',
    html,
    text,
  });
}
