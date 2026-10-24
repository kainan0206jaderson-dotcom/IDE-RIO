import { useEffect, useState } from 'react';
import { ProjectsProvider, useProjects } from './store/useProjects';
import { Office } from './screens/Office';
import { Workspace, type ViewId } from './screens/Workspace';

export type Route = { screen: 'office' } | { screen: 'workspace'; projectId: string; view: ViewId };

function Shell() {
  const { ready, get } = useProjects();
  const [route, setRoute] = useState<Route>({ screen: 'office' });

  useEffect(() => {
    if (route.screen === 'workspace' && ready && !get(route.projectId)) setRoute({ screen: 'office' });
  }, [route, ready, get]);

  if (!ready)
    return (
      <div className="boot" role="status">
        <span className="boot-mark">IDEÁRIO</span>
        <span className="boot-line">Abrindo o escritório…</span>
      </div>
    );

  if (route.screen === 'workspace')
    return (
      <Workspace
        key={route.projectId}
        projectId={route.projectId}
        view={route.view}
        onView={(view) => setRoute({ ...route, view })}
        onExit={() => setRoute({ screen: 'office' })}
      />
    );

  return <Office onOpen={(projectId, view = 'map') => setRoute({ screen: 'workspace', projectId, view })} />;
}

export default function App() {
  return (
    <ProjectsProvider>
      <Shell />
    </ProjectsProvider>
  );
}
