
/* ===== formulário (lógica original da LP: máscara, cidades/bairros, webhook e WhatsApp) ===== */

(() => {
  const WHATSAPP_SUPORTE = '558007505596';

  // WhatsApp comercial da FibraLink — recebe quem concluiu o cadastro (fluxo "não é cliente")
  const WHATSAPP_COMERCIAL = '558007505596';

  // Manda o cadastro pros dois: teste (só recebe com o workflow em "Listen for
  // test event" no n8n) e produção (recebe quando o workflow estiver ativado).
  const WEBHOOK_URLS = [
    'https://automation.opscap.collieassociados.com/webhook-test/form-novo',
    'https://automation.opscap.collieassociados.com/webhook/form-novo',
  ];

  // Lista extraída da planilha "Caixas (7)_geocodificado" (colunas Cidade/Bairro,
  // abas "Cobertura" + "Em projeto"). Santa Cruz da Serra e Piabetá são distritos,
  // então usam os bairros cadastrados como "Duque de Caxias" e "Magé" na planilha.
  const BAIRROS_POR_CIDADE = {
    'Petrópolis': ['Alto da Serra', 'Bingen', 'Cascatinha', 'Castelânea', 'Castrioto', 'Centro', 'Duarte da Silveira', 'Floresta', 'Independência', 'Itamarati', 'Mosela', 'Quarteirão Ingelheim', 'Quissamã', 'Quitandinha', 'Retiro', 'Siméria', 'São Sebastião', 'Valparaíso', 'Vila Felipe'],
    'Santa Cruz da Serra': ['Barro Branco', 'Parada Angélica', 'Parada Morabi', 'Parque Eldorado', 'Santa Cruz da Serra', 'Saracuruna'],
    'Guapimirim': ['Bairro Ideal', 'Bananal', 'Caneca Fina', 'Capim', 'Centro', 'Cotia', 'Iconha', 'Jardim Guapimirim', 'Limoeiro', 'Paiol', 'Parada Ideal', 'Parada Modelo', 'Parque Fleixal', 'Praça Niterói', 'Quinta Mariana', 'Serra da Caneca Fina', 'Vale do Jequitibá'],
    'Piabetá': ['Cachoeira Grande', 'Citrolândia', 'Fragoso', 'Inhomirim', 'Jardim Nazareno', 'Limeira', 'Meio da Serra', 'Parque Caçula', 'Pau Grande', 'Piabetá', "Rio d'Ouro", 'Vila Felipe', 'Vila Inhomirim'],
  };

  const form = document.getElementById('lead-form');
  const telefoneInput = document.getElementById('telefone');
  const jaClienteSelect = document.getElementById('ja-cliente');
  const blocoCliente = document.getElementById('bloco-cliente');
  const blocoNovoLead = document.getElementById('bloco-novo-lead');
  const cidadeSelect = document.getElementById('cidade');
  const campoBairro = document.getElementById('campo-bairro');
  const btnSuporteWhatsapp = document.getElementById('btn-suporte-whatsapp');

  // Captura UTMs e cliques ids da URL, pra mandar junto com o cadastro
  const params = new URLSearchParams(window.location.search);
  const utms = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(k => {
    if (params.get(k)) utms[k] = params.get(k);
  });

  // Máscara de telefone
  telefoneInput.addEventListener('input', () => {
    let v = telefoneInput.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length > 0) v = v.replace(/^(\d{0,2})/, '($1');
    telefoneInput.value = v;
  });

  // Já é cliente? -> mostra bloco de suporte OU bloco de cidade/bairro
  jaClienteSelect.addEventListener('change', () => {
    const ehCliente = jaClienteSelect.value === 'Sim';

    blocoCliente.hidden = !ehCliente;
    blocoNovoLead.hidden = ehCliente;

    if (ehCliente) {
      const nome = document.getElementById('nome').value || '';
      const mensagem = `Olá! Meu nome é ${nome} e já sou cliente. Preciso de suporte.`;
      btnSuporteWhatsapp.href = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(mensagem)}`;
    } else {
      cidadeSelect.value = '';
      campoBairro.hidden = true;
      campoBairro.innerHTML = '';
    }
  });

  // Cidade selecionada -> monta o campo de bairro certo
  cidadeSelect.addEventListener('change', () => {
    const cidade = cidadeSelect.value;
    campoBairro.innerHTML = '';
    campoBairro.hidden = !cidade;
    if (!cidade) return;

    const label = document.createElement('label');
    label.setAttribute('for', 'bairro');
    label.textContent = 'Bairro';
    campoBairro.appendChild(label);

    const select = document.createElement('select');
    select.id = 'bairro';
    select.name = 'bairro';
    select.required = true;

    const optionVazia = document.createElement('option');
    optionVazia.value = '';
    optionVazia.disabled = true;
    optionVazia.selected = true;
    optionVazia.textContent = 'Selecione o bairro';
    select.appendChild(optionVazia);

    (BAIRROS_POR_CIDADE[cidade] || []).forEach(bairro => {
      const option = document.createElement('option');
      option.value = bairro;
      option.textContent = bairro;
      select.appendChild(option);
    });

    const optionOutro = document.createElement('option');
    optionOutro.value = 'Outro';
    optionOutro.textContent = 'Outro';
    select.appendChild(optionOutro);

    campoBairro.appendChild(select);

    // "Outro" -> abre campo de texto livre pro bairro que não está na lista
    const inputOutro = document.createElement('input');
    inputOutro.type = 'text';
    inputOutro.id = 'bairro-outro';
    inputOutro.name = 'bairro_outro';
    inputOutro.placeholder = 'Digite o nome do seu bairro';
    inputOutro.hidden = true;
    campoBairro.appendChild(inputOutro);

    select.addEventListener('change', () => {
      const ehOutro = select.value === 'Outro';
      inputOutro.hidden = !ehOutro;
      inputOutro.required = ehOutro;
      if (!ehOutro) inputOutro.value = '';
    });
  });

  // Envio do formulário (só chega aqui no fluxo "não é cliente")
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Bloqueia o envio se algum campo obrigatório não foi preenchido
    // e mostra o aviso nativo do navegador no campo que falta.
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = Object.assign(Object.fromEntries(new FormData(form)), utms);

    if (payload.bairro === 'Outro' && payload.bairro_outro) {
      payload.bairro = payload.bairro_outro;
    }
    delete payload.bairro_outro;

    if (window.dataLayer) window.dataLayer.push({ event: 'form_submit', ...payload });

    await Promise.allSettled(
      WEBHOOK_URLS.map(url => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }))
    ); // segue o fluxo mesmo se algum webhook falhar

    const mensagem = 'Olá! Vim do Google LP e tenho interesse nos planos da FibraLink';
    const waLink = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(mensagem)}`;
    window.location.href = waLink;
  });

  form.addEventListener('input', () => {
    if (window.dataLayer && !window.__formStarted) {
      window.dataLayer.push({ event: 'form_start' });
      window.__formStarted = true;
    }
  }, { once: true });
})();


;

(function(){
  /* "Quero contratar" some quando a pessoa já é cliente (o caminho é o suporte) */
  var sel=document.getElementById('ja-cliente'), btn=document.getElementById('bf-submit');
  if(sel&&btn) sel.addEventListener('change',function(){ btn.hidden = sel.value==='Sim'; });

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero=document.querySelector('.hero'), wrap=document.getElementById('hero-wrap');
  requestAnimationFrame(function(){ wrap.classList.add('ready'); });
  if(reduce) return;

  /* profundidade: camadas seguem o mouse em velocidades diferentes e sobem em ritmos diferentes na rolagem */
  var layers=[].slice.call(document.querySelectorAll('[data-depth]'));
  var mx=0,my=0,cx=0,cy=0,sy=0, fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(fine) hero.addEventListener('pointermove',function(e){ var r=hero.getBoundingClientRect();
    mx=(e.clientX-r.left)/r.width-.5; my=(e.clientY-r.top)/r.height-.5; });
  hero.addEventListener('pointerleave',function(){ mx=0; my=0; });
  addEventListener('scroll',function(){ sy=scrollY; },{passive:true});
  (function tick(){
    cx+=(mx-cx)*.08; cy+=(my-cy)*.08;
    if(sy < hero.offsetHeight+200){
      layers.forEach(function(l){ var d=+l.dataset.depth, s=+(l.dataset.scroll||0);
        l.style.transform='translate3d('+(-cx*d).toFixed(2)+'px,'+(-cy*d*.6 - sy*s).toFixed(2)+'px,0)'; });
    }
    requestAnimationFrame(tick);
  })();
})();

;

(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* CTAs das seções levam ao formulário e já posicionam no campo Nome */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-goform]'); if(!a) return;
    var f = document.getElementById('formulario'); if(!f) return;
    e.preventDefault(); f.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'});
    var n = document.getElementById('nome'); if(n) setTimeout(function(){ n.focus({preventScroll:true}); }, reduce ? 0 : 700);
  });

  /* contagem dos números (600 / 1000) */
  function countUp(el){
    var end = +el.dataset.count, t0 = null, dur = 1400;
    function step(t){ if(!t0) t0 = t; var p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,4);
      el.textContent = Math.round(end*e); if(p<1) requestAnimationFrame(step); }
    el.textContent = '0'; requestAnimationFrame(step);
  }

  if(reduce || !('IntersectionObserver' in window)){
    document.querySelectorAll('.sr').forEach(function(el){ el.classList.add('is-in'); });
    document.querySelectorAll('[data-fill]').forEach(function(el){ el.classList.add('is-in'); });
    return;
  }

  /* entradas ao rolar */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target; el.classList.add('is-in'); io.unobserve(el);
      el.querySelectorAll && el.querySelectorAll('[data-count]').forEach(countUp);
    });
  }, {threshold:.15, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.sr,[data-fill],.mesh').forEach(function(el){ io.observe(el); });

  /* títulos que acendem e brilhos que se movem com a rolagem */
  var lits = [].slice.call(document.querySelectorAll('.lit'));
  var gs = [].slice.call(document.querySelectorAll('[data-gs]'));
  var ticking = false;
  function frame(){
    ticking = false; var vh = innerHeight;
    lits.forEach(function(el){ var r = el.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (vh*.92 - r.top) / (vh*.42))); el.style.setProperty('--p', p.toFixed(3)); });
    gs.forEach(function(el){ var r = el.parentElement.getBoundingClientRect();
      var off = (r.top + r.height/2 - vh/2) * +el.dataset.gs; el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)'; });
  }
  addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(frame); } }, {passive:true});
  addEventListener('resize', frame); frame();
})();
