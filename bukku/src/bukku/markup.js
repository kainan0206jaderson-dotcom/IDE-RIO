const markup = String.raw`<canvas id="gl" tabindex="0" aria-label="Escritório do BUKKU em 3D"></canvas>
<div class="vignette"></div>
<div class="grain"></div>

<div class="ui brand-float is-hidden" id="brandFloat"><img class="logo" data-logo="inline" alt="BUKKU" translate="no"></div>
<div class="ui chip is-hidden" id="holding">com um café na mão</div>

<div class="ui" id="intro">
  <canvas id="introCv" aria-hidden="true"></canvas>
  <div class="sheet-wrap" id="sheetWrap">
    <div class="sheet" id="sheet">
      <img class="logo mark" data-logo="introMark" alt="" aria-hidden="true">
      <h1 class="name" translate="no"><img class="logo word" data-logo="introWord" alt="BUKKU"></h1>
      <p class="tag">Onde suas ideias viram portfólio.</p>
      <button class="cta" id="btnEnter" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l4-4-4-4"/><path d="M13 12H3"/></svg>
        Entrar no escritório
      </button>
      <p class="load" id="loadTxt">arrumando a mesa…</p>
    </div>
  </div>
</div>

<div class="ui is-hidden" id="cross"></div>
<div class="ui chip is-hidden" id="label"></div>
<div class="ui chip is-hidden" id="hint"></div>
<div class="ui is-hidden" id="joy"><i></i></div>
<div class="ui is-hidden" id="joyHome">andar</div>
<button class="ui is-hidden" id="actBtn">Usar</button>

<header class="ui is-hidden" id="deskTopbar">
  <div class="brand"><img class="logo" data-logo="inline" alt="BUKKU" translate="no"></div>
  <button class="ghost" id="btnBack" aria-label="Voltar ao escritório">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    <span>Voltar ao escritório</span>
  </button>
</header>
<div class="ui is-hidden" id="projHead"><h1 id="projTitle"></h1><p id="projMeta"></p></div>
<div class="ui is-hidden" id="dots"></div>
<nav class="ui is-hidden" id="dock" aria-label="Cadernos">
  <button class="round" id="btnPrev" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
  <button class="pill" id="btnMain"></button>
  <button class="round" id="btnCover" aria-label="Trocar a capa do caderno"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="9.5" cy="9" r="1.8"/><path d="M20 16l-5-5-9 9"/></svg></button>
  <button class="round" id="btnView" aria-label="Ver as duas páginas" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg></button>
  <button class="round" id="btnStudio" aria-label="Abrir no estúdio de marca" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3"/><path d="M4 18c3-1.5 5-1.5 8 0s5 1.5 8 0"/><path d="M8 15a4 4 0 0 1 8 0"/></svg></button>
  <button class="round" id="btnNext" aria-label="Próximo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></button>
</nav>

<div class="ui is-hidden" id="posterMenu" role="dialog" aria-labelledby="pmTitle">
  <h2 id="pmTitle">Quadro</h2>
  <p id="pmDesc">Escolha uma imagem do seu dispositivo. Ela é recortada no formato do quadro.</p>
  <button class="pill" id="pmAct" hidden>Pegar café</button>
  <div class="row">
    <label class="pill sm" id="pmChange" for="pmFile" role="button" tabindex="0">Trocar imagem</label>
    <button class="ghost" id="pmGal">Galeria do BUKKU</button>
    <button class="ghost" id="pmReset">Original</button>
    <button class="ghost" id="pmCancel">Fechar</button>
  </div>
  <div class="paste" id="pmPaste" contenteditable="true" role="textbox" aria-label="Área para colar uma imagem" inputmode="none">ou toque aqui e cole uma imagem</div>
  <p id="pmBrowser">O seletor de fotos não abriu? <a href="https://claude.ai/artifact/QmrMYf4JQAxrZ18C1xkALd" target="_blank" rel="noopener">Abra no navegador do celular</a>.</p>
  <input type="file" id="pmFile" accept="image/*" class="vh" tabindex="-1">
</div>

<section class="ui is-hidden" id="paint" aria-label="Ateliê de pintura">
  <div class="studio">
    <header class="studio-top">
      <div class="studio-title"><b id="paintName">Tela 1</b><span id="paintState">salva</span></div>
      <div class="studio-actions">
        <button class="tool" id="pUndo" aria-label="Desfazer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg></button>
        <button class="tool" id="pRedo" aria-label="Refazer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg></button>
        <button class="tool txt" id="pClear">Limpar</button>
        <button class="pill sm" id="pSave">Salvar</button>
        <button class="round" id="pClose" aria-label="Fechar ateliê"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </header>
    <div class="studio-body">
      <aside class="tools" aria-label="Ferramentas">
        <p class="lbl">ferramentas</p>
        <button class="tool" data-tool="lapis" aria-label="Lápis"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3l4 4L8 20H4v-4z"/></svg><span>Lápis</span></button>
        <button class="tool on" data-tool="caneta" aria-label="Caneta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19l7-7 3 3-7 7z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/></svg><span>Caneta</span></button>
        <button class="tool" data-tool="pincel" aria-label="Pincel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2l4 4-9 9-4-4z"/><path d="M9 11c-3 0-5 2-5 5 0 2-1 3-2 4 3 1 8 0 9-4"/></svg><span>Pincel</span></button>
        <button class="tool" data-tool="marcador" aria-label="Marcador"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg><span>Marcador</span></button>
        <button class="tool" data-tool="borracha" aria-label="Borracha"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8"/></svg><span>Borracha</span></button>
        <p class="lbl">espessura</p>
        <input class="sizer" id="pSize" type="range" min="1" max="60" value="8" aria-label="Espessura">
        <p class="lbl">cores</p>
        <div class="swatches" id="swatches"></div>
      </aside>
      <div class="board" id="board"><div class="canvas-stack" id="stack"><canvas id="pc" width="1000" height="1250"></canvas><canvas id="ps" width="1000" height="1250" aria-label="Tela de pintura"></canvas></div></div>
      <aside class="pages" aria-label="Telas">
        <p class="lbl">telas</p>
        <div id="pageList"></div>
        <button class="tool" id="pNew" aria-label="Nova tela"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Nova tela</span></button>
        <button class="tool" id="pDel" aria-label="Excluir tela"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg><span>Excluir tela</span></button>
      </aside>
    </div>
  </div>
</section>
<section class="ui is-hidden" id="studio" aria-label="Estúdio de marca">
  <div class="st-wrap">
    <header class="st-top">
      <div class="st-title"><img class="logo" data-logo="inline" alt="" aria-hidden="true"><b id="stProj">Novo projeto</b><span id="stState"></span></div>
      <div class="st-actions">
        <button class="ghost" id="stZip" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg><span>Kit ZIP</span></button>
        <button class="ghost" id="stPdf" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/></svg><span>Brand book PDF</span></button>
        <button class="round" id="stClose" aria-label="Fechar estúdio e voltar à mesa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </header>
    <div class="st-body">
      <form class="st-form" id="stForm" novalidate>
        <fieldset class="card">
          <legend>identidade</legend>
          <label class="fl"><span class="hd">nome da marca</span><input id="fName" name="brandName" maxlength="40" autocomplete="off" placeholder="Ex.: Fornalha…"></label>
          <div class="fl"><span class="hd"><label for="fBrief">briefing</label><button type="button" class="mini" id="sBrief">↻ me surpreenda</button></span><textarea id="fBrief" name="briefing" maxlength="420" placeholder="O que é, para quem e que sensação deve passar…"></textarea></div>
          <div class="drops">
            <label class="drop"><span class="slot" data-slot="symbol">+<b class="x" role="button" aria-label="Remover símbolo">×</b></span>símbolo<input type="file" accept="image/*" data-slot="symbol" class="vh" tabindex="-1"></label>
            <label class="drop"><span class="slot" data-slot="wordmark">+<b class="x" role="button" aria-label="Remover logotipo">×</b></span>logotipo<input type="file" accept="image/*" data-slot="wordmark" class="vh" tabindex="-1"></label>
            <label class="drop"><span class="slot" data-slot="ref">+<b class="x" role="button" aria-label="Remover referência">×</b></span>referência<input type="file" accept="image/*" data-slot="ref" class="vh" tabindex="-1"></label>
          </div>
          <div class="slotrow">da galeria do BUKKU: <button type="button" class="mini" data-gal="symbol">símbolo</button><button type="button" class="mini" data-gal="wordmark">logotipo</button><button type="button" class="mini" data-gal="ref">referência</button></div>
          <p class="note">Opcional. Se você enviar, o sistema usa o que já existe.</p>
        </fieldset>
        <fieldset class="card">
          <legend>cores</legend>
          <div class="swrow" id="fColors"></div>
          <div class="row"><button type="button" class="mini" id="sColors">↻ me surpreenda</button><button type="button" class="mini" id="cAdd">+ cor</button><button type="button" class="mini" id="cImg" hidden>tirar da imagem</button><button type="button" class="mini" id="cAuto">deixar a IA escolher</button></div>
        </fieldset>
        <fieldset class="card">
          <legend>estilo</legend>
          <p class="grp">visual</p>
          <div class="sl"><span>atemporal</span><input type="range" id="s_fut" min="0" max="100" value="50" aria-label="Atemporal ou futurista"><span>futurista</span></div>
          <div class="sl"><span>contido</span><input type="range" id="s_sat" min="0" max="100" value="50" aria-label="Contido ou saturado"><span>saturado</span></div>
          <div class="sl"><span>orgânico</span><input type="range" id="s_geo" min="0" max="100" value="50" aria-label="Orgânico ou geométrico"><span>geométrico</span></div>
          <div class="sl"><span>plano</span><input type="range" id="s_tex" min="0" max="100" value="50" aria-label="Plano ou texturizado"><span>texturizado</span></div>
          <p class="grp">voz</p>
          <div class="sl"><span>calmo</span><input type="range" id="s_ene" min="0" max="100" value="50" aria-label="Calmo ou enérgico"><span>enérgico</span></div>
          <div class="sl"><span>sério</span><input type="range" id="s_fun" min="0" max="100" value="50" aria-label="Sério ou divertido"><span>divertido</span></div>
          <div class="sl"><span>acessível</span><input type="range" id="s_lux" min="0" max="100" value="50" aria-label="Acessível ou luxuoso"><span>luxuoso</span></div>
          <div class="sl"><span>discreto</span><input type="range" id="s_ous" min="0" max="100" value="50" aria-label="Discreto ou ousado"><span>ousado</span></div>
          <p class="grp">forma</p>
          <div class="sl"><span>clássica</span><input type="range" id="s_tip" min="0" max="100" value="50" aria-label="Tipografia clássica ou experimental"><span>experimental</span></div>
          <div class="sl"><span>estático</span><input type="range" id="s_mov" min="0" max="100" value="50" aria-label="Estático ou dinâmico"><span>dinâmico</span></div>
          <div class="row"><button type="button" class="mini" id="sStyle">↻ me surpreenda</button></div>
        </fieldset>
        <fieldset class="card">
          <legend>aplicações</legend>
          <p class="note">Escolha as peças do kit, ou deixe tudo desligado e a gente escolhe.</p>
          <div id="fApps"></div>
        </fieldset>
        <fieldset class="card">
          <legend>qualidade</legend>
          <div class="seg" id="fQual">
            <button type="button" data-q="quick">Rápida<small>segundos</small></button>
            <button type="button" data-q="default" class="on">Equilibrada<small>~1 min</small></button>
            <button type="button" data-q="complex">Alta<small>~2 min</small></button>
          </div>
          <p class="note" id="fEngine">IA: verificando…</p>
          <div class="row"><button type="button" class="mini" id="fConnect">conectar Pollinations (grátis)</button><button type="button" class="mini" id="fDisconnect" hidden>desconectar</button></div>
          <p class="note" id="fConnectNote">Com uma conta Pollinations (entra com o GitHub e usa o Pollen grátis das missões), o estúdio desenha também as 4 pranchas com o seu logo.</p>
          <details class="keybox"><summary>colar uma chave da Pollinations</summary>
            <p class="note">Crie em <a href="https://enter.pollinations.ai/keys" target="_blank" rel="noopener">enter.pollinations.ai/keys</a>, de preferência com limite de gasto. Ela fica só neste navegador.</p>
            <div class="row"><input id="fKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk_…" aria-label="Chave da Pollinations"><button type="button" class="mini" id="fKeySave">salvar</button></div>
          </details>
        </fieldset>
        <button class="pill gen" id="stGen" type="submit">Gerar marca →</button>
      </form>
      <div class="st-board" id="stBoard">
        <div class="empty" id="stEmpty"><span class="k">pronto.</span><b>Preencha a ficha e gere o primeiro kit da sua marca.</b><small>Você recebe as páginas de identidade, e elas viram o brand book no caderno.</small></div>
        <div class="prog" id="stProg" hidden><b id="stProgT">pensando</b><span class="dots"><i></i><i></i><i></i></span><button type="button" class="mini" id="stStop">parar</button></div>
        <div class="kit-h" id="stKitH" hidden><b id="stKitT">kit</b><span id="stKitS"></span><span class="kitw" id="stKitW" hidden></span></div>
        <div class="kit" id="stGrid"></div>
        <form class="refine" id="stRefine" hidden><input id="fRefine" name="refine" maxlength="200" autocomplete="off" placeholder="Ajustar: mais editorial, troque só a paleta…" aria-label="Pedido de ajuste"><button class="pill sm" type="submit">Ajustar</button></form>
        <div class="gens" id="stGens" aria-label="Gerações anteriores"></div>
      </div>
    </div>
  </div>
</section>
<section class="ui is-hidden" id="gallery" role="dialog" aria-labelledby="galTitle">
  <div class="gal">
    <header class="gal-top"><b id="galTitle">Galeria do BUKKU</b><button class="round" id="galClose" aria-label="Fechar galeria"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <div class="gal-body" id="galBody"></div>
  </div>
</section>
<div class="ui is-hidden" id="toast" role="status" aria-live="polite"></div>

`;
export default markup;
