import { useProjects } from '../store/useProjects';
import { Icon } from './Icon';

/** Onde os dados estão + estado do salvamento. Sempre ícone + texto, nunca só cor. */
export function StorageBadge({ compact }: { compact?: boolean }) {
  const { backend, saveState, saveError } = useProjects();
  const where = backend === 'cloud' ? 'Salvo na sua conta' : 'Salvo neste navegador';
  let label = where;
  let icon = backend === 'cloud' ? 'cloud' : 'device';
  let cls = 'ok';
  if (saveState === 'saving') {
    label = 'Salvando…';
    icon = 'rotate';
    cls = 'busy';
  } else if (saveState === 'error') {
    label = saveError || 'Erro ao salvar';
    icon = 'warn';
    cls = 'error';
  } else if (saveState === 'saved') {
    label = backend === 'cloud' ? 'Salvo na sua conta' : 'Salvo neste navegador';
    icon = 'check';
  }
  return (
    <span className={'save-badge ' + cls + (compact ? ' compact' : '')} role="status" aria-live="polite" title={where}>
      <Icon name={icon} size={14} />
      <span className="save-label">{label}</span>
    </span>
  );
}
