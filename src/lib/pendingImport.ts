/** Arquivos escolhidos no escritório que a tela de importação processa ao abrir o sketchbook. */
const pending = new Map<string, File[]>();

export const queueImport = (projectId: string, files: File[]) => pending.set(projectId, files);

export function takeImport(projectId: string) {
  const f = pending.get(projectId);
  pending.delete(projectId);
  return f ?? [];
}
