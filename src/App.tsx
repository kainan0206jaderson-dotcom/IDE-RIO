import { lazy, Suspense, useEffect, useState } from 'react';
import { ProjectsProvider, useProjects } from './store/useProjects';
import { Office } from './screens/Office';
import { Workspace, type ViewId } from './screens/Workspace';

const Intro3D = lazy(() => import('./screens/Intro3D'));

/** A abertura roda uma vez por sessão; quem pede menos movimento vai direto ao escritório. */
function introWanted() {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return sessionStorage.getItem('ideario:intro') !== '1';
  } catch {
    return true;
  }
}

export type Route = { screen: 'office' } | { screen: 'workspace'; projectId: string; view: ViewId };

function Shell() {
  const { ready, get, projects } = useProjects();
  const [route, setRoute] = useState<Route>({ screen: 'office' });
  const [intro, setIntro] = useState(introWanted);
  const endIntro = () => {
    try {
      sessionStorage.setItem('ideario:intro', '1');
    } catch {
      /* navegação privada */
    }
    setIntro(false);
  };

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

  if (intro)
    return (
      <Suspense fallback={<div className="intro" />}>
        <Intro3D projects={projects} onDone={endIntro} />
      </Suspense>
    );

  return <Office onOpen={(projectId, view = 'map') => setRoute({ screen: 'workspace', projectId, view })} onReplayIntro={() => setIntro(true)} />;
}

export default function App() {
  return (
    <ProjectsProvider>
      <Shell />
    </ProjectsProvider>
  );
}
