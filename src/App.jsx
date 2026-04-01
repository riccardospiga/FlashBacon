import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

/* ═══════════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════════ */
const CSS = `
  :root{--red:#C0281C;--red-dk:#9A1F14;--orange:#F47C20;--orange-lt:#FAA96A;--white:#FFFFFF;--gray:#F4F4F4;--gray2:#E4E4E4;--ink:#1A1A1A;--muted:#888888;--dark-bg:#1C1C2E;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:var(--red);min-height:100vh;color:var(--ink);overflow-x:hidden;}
  .screen{min-height:100dvh;display:flex;flex-direction:column;}
  .anim{animation:fadeIn .3s ease;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes toastA{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  @keyframes loadBar{0%{width:0%}60%{width:80%}100%{width:100%}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
  @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}

  .logo-icon{background:var(--dark-bg);border-radius:26px;border:1.5px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .brand-name{font-family:'Syne',sans-serif;font-weight:800;color:var(--white);letter-spacing:-.5px;line-height:1.1;}
  .brand-name em{color:var(--orange);font-style:normal;}
  .login-card .brand-name{color:var(--ink);}
  .loading-bar-track{width:220px;height:4px;background:rgba(255,255,255,.12);border-radius:99px;overflow:hidden;}
  .loading-bar-fill{height:100%;background:var(--red);border-radius:99px;animation:loadBar 2.5s ease-in-out forwards;}

  /* Login */
  .login-card{background:var(--white);border-radius:28px;padding:36px 32px 32px;width:100%;max-width:400px;box-shadow:0 8px 40px rgba(0,0,0,.18);}
  .login-header{display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:28px;}
  .login-header p{color:var(--muted);font-size:.88rem;text-align:center;}
  .tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--gray);border-radius:14px;padding:4px;margin-bottom:24px;}
  .tab{padding:10px;text-align:center;cursor:pointer;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:.9rem;color:var(--muted);border:none;background:none;transition:all .2s;}
  .tab.active{background:var(--white);color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .field{margin-bottom:16px;}
  .field label{display:block;font-size:.82rem;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
  .field input,.select-field{width:100%;padding:14px 16px;background:#F8F9FB;border:1.5px solid var(--gray2);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.95rem;color:var(--ink);outline:none;transition:border .2s;}
  .field input:focus,.select-field:focus{border-color:var(--orange);}
  .select-field{cursor:pointer;margin-bottom:12px;appearance:none;}
  .error-msg{color:var(--red);font-size:.85rem;text-align:center;margin-top:10px;font-weight:500;}

  /* Buttons */
  .btn-primary{width:100%;padding:15px;background:var(--red);color:var(--white);border:none;border-radius:16px;font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;cursor:pointer;transition:background .2s,transform .1s;margin-top:8px;}
  .btn-primary:hover{background:var(--red-dk);}
  .btn-primary:active{transform:scale(.98);}
  .btn-primary:disabled{opacity:.6;cursor:not-allowed;}
  .btn-secondary{background:none;border:1.5px solid var(--gray2);border-radius:16px;padding:14px;color:var(--ink);font-weight:600;font-size:.95rem;cursor:pointer;width:100%;transition:border-color .2s;margin-top:8px;font-family:'DM Sans',sans-serif;}
  .btn-secondary:hover{border-color:var(--orange);}
  .btn-sm{padding:7px 14px;border-radius:10px;font-size:.8rem;font-weight:600;cursor:pointer;border:1.5px solid var(--gray2);background:none;transition:all .2s;font-family:'DM Sans',sans-serif;}
  .btn-sm.primary{background:var(--red);color:white;border-color:var(--red);}
  .btn-sm.danger{color:var(--red);}
  .btn-sm.danger:hover{border-color:var(--red);background:rgba(192,40,28,.05);}
  .btn-sm:hover{border-color:var(--orange);}
  .icon-btn{background:rgba(255,255,255,.15);border:none;border-radius:12px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;transition:background .2s;}
  .icon-btn:hover{background:rgba(255,255,255,.28);}
  .back-btn{background:rgba(255,255,255,.18);border:none;border-radius:12px;padding:8px 14px;color:white;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.9rem;transition:background .2s;}
  .back-btn:hover{background:rgba(255,255,255,.28);}

  /* Top / Bottom */
  .top-bar{background:var(--red);padding:16px 20px 12px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .logo-small{display:flex;align-items:center;gap:10px;}
  .bottom-bar{background:var(--white);border-top:1px solid var(--gray2);display:flex;justify-content:space-around;padding:10px 0 18px;position:sticky;bottom:0;z-index:100;}
  .bottom-btn{display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:6px 16px;color:var(--muted);font-size:.7rem;font-weight:600;transition:color .2s;font-family:'DM Sans',sans-serif;}
  .bottom-btn.active{color:var(--red);}

  /* Home */
  .home-body{flex:1;background:var(--gray);border-radius:28px 28px 0 0;padding:24px 20px;margin-top:4px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;}
  .section-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.35rem;color:var(--ink);line-height:1.2;}
  .materia-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .materia-card{background:var(--white);border-radius:20px;padding:18px 16px;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.08);transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column;gap:10px;user-select:none;position:relative;}
  .materia-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.14);}
  .materia-card:active{transform:scale(.97);}
  .materia-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;color:var(--ink);line-height:1.3;}
  .materia-count{font-size:.75rem;color:var(--muted);font-weight:500;}
  .add-card{background:rgba(196,40,28,.07);border:2px dashed rgba(196,40,28,.25);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:120px;}
  .add-card span{font-size:1.6rem;color:var(--red);}
  .add-card p{font-size:.82rem;color:var(--red);font-weight:600;}

  /* Checkbox select */
  .sel-check{position:absolute;top:10px;left:10px;width:20px;height:20px;border-radius:6px;border:2px solid var(--gray2);background:var(--white);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;z-index:2;}
  .sel-check.checked{background:var(--red);border-color:var(--red);}
  .sel-bar{background:var(--white);border-radius:14px;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .sel-bar span{font-size:.85rem;font-weight:600;}

  /* Screen titles */
  .screen-title-bar{padding:16px 20px 14px;}
  .screen-title-bar h1{font-family:'Syne',sans-serif;font-weight:800;font-size:1.6rem;color:white;line-height:1.15;}
  .screen-subtitle{color:rgba(255,255,255,.75);font-size:.85rem;margin-top:2px;}

  /* Argomenti */
  .argomenti-list{display:flex;flex-direction:column;gap:8px;}
  .argomento-row{background:var(--white);border-radius:16px;padding:14px 16px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px;transition:transform .15s;user-select:none;}
  .argomento-row:hover{transform:translateX(3px);}
  .argomento-name{font-weight:600;font-size:.92rem;flex:1;}
  .row-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}
  .row-del{background:none;border:none;cursor:pointer;color:var(--muted);display:flex;align-items:center;padding:4px;border-radius:8px;transition:color .2s;}
  .row-del:hover{color:var(--red);}

  /* Argomento detail */
  .argomento-top{background:var(--red);}
  .argomento-tabs{display:flex;gap:6px;padding:0 16px;overflow-x:auto;scrollbar-width:none;}
  .argomento-tabs::-webkit-scrollbar{display:none;}
  .arg-tab{background:rgba(255,255,255,.18);border:none;border-radius:12px 12px 0 0;padding:10px 16px;color:rgba(255,255,255,.75);font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap;transition:all .2s;flex-shrink:0;font-family:'DM Sans',sans-serif;}
  .arg-tab.active{background:var(--gray);color:var(--ink);}
  .arg-body{flex:1;padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;background:var(--gray);}

  /* Fonte rows */
  .fonte-row{background:var(--white);border-radius:14px;display:flex;align-items:center;gap:12px;padding:10px 14px;box-shadow:0 2px 8px rgba(0,0,0,.05);min-height:60px;}
  .fonte-preview{width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0;background:var(--gray);display:flex;align-items:center;justify-content:center;font-size:1.4rem;overflow:hidden;}
  .fonte-preview img{width:100%;height:100%;object-fit:cover;}
  .fonte-name{flex:1;font-size:.85rem;font-weight:500;color:var(--ink);word-break:break-all;line-height:1.4;}
  .fonte-name .fonte-type{font-size:.72rem;color:var(--muted);display:block;}
  .fonte-btn{background:none;border:none;cursor:pointer;color:var(--muted);padding:6px;border-radius:8px;display:flex;align-items:center;transition:color .2s;flex-shrink:0;}
  .fonte-btn:hover{color:var(--orange);}
  .fonte-btn.del:hover{color:var(--red);}

  /* FAB add fonte */
  .fab{position:fixed;bottom:24px;right:20px;z-index:150;width:52px;height:52px;border-radius:50%;background:var(--red);border:none;color:white;font-size:1.6rem;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 24px rgba(192,40,28,.4);transition:transform .2s;}
  .fab:hover{transform:scale(1.08);}
  .fab:active{transform:scale(.95);}

  /* Fonte picker popup */
  .fonte-picker{background:var(--white);border-radius:24px;padding:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;width:100%;max-width:360px;}
  .fonte-type-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:14px;border:1.5px solid var(--gray2);background:none;cursor:pointer;transition:all .2s;}
  .fonte-type-btn:hover{border-color:var(--orange);background:#FFF8F3;}
  .fonte-type-btn span{font-size:1.6rem;}
  .fonte-type-btn p{font-size:.72rem;font-weight:600;color:var(--ink);text-align:center;}

  /* Tools */
  .tools-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .tool-card{background:var(--white);border-radius:18px;padding:16px;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.07);transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column;gap:6px;}
  .tool-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.13);}
  .tool-card:active{transform:scale(.97);}
  .tool-icon{font-size:1.6rem;}
  .tool-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;line-height:1.2;}
  .tool-desc{font-size:.75rem;color:var(--muted);}

  /* Storico rows */
  .storico-row{background:var(--white);border-radius:16px;padding:14px 16px;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px;user-select:none;transition:border .15s;}
  .storico-row.sel{border:2px solid var(--red);}
  .storico-info{flex:1;min-width:0;}
  .storico-tipo{background:rgba(196,40,28,.1);color:var(--red);font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:99px;text-transform:uppercase;letter-spacing:.5px;display:inline-block;margin-bottom:4px;}
  .storico-preview{font-size:.82rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .storico-data{font-size:.7rem;color:var(--muted);margin-top:2px;}

  /* Chat */
  .chat-wrap{display:flex;flex-direction:column;flex:1;gap:12px;}
  .chat-messages{flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-bottom:8px;min-height:180px;max-height:52vh;}
  .chat-bubble{padding:12px 16px;border-radius:18px;max-width:88%;font-size:.9rem;line-height:1.55;}
  .chat-bubble.user{background:var(--red);color:white;align-self:flex-end;border-radius:18px 18px 4px 18px;}
  .chat-bubble.ai{background:var(--white);color:var(--ink);align-self:flex-start;box-shadow:0 2px 12px rgba(0,0,0,.07);border-radius:18px 18px 18px 4px;}
  .chat-sender{font-size:.7rem;font-weight:700;opacity:.65;margin-bottom:4px;}
  .chat-input-row{display:flex;gap:8px;}
  .chat-input{flex:1;padding:13px 16px;background:var(--white);border:1.5px solid var(--gray2);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;transition:border .2s;}
  .chat-input:focus{border-color:var(--orange);}
  .btn-send{background:var(--red);border:none;border-radius:14px;width:46px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;transition:background .2s;flex-shrink:0;}
  .btn-send:hover{background:var(--red-dk);}
  .btn-send:disabled{opacity:.5;cursor:not-allowed;}

  /* Settings panel (AI) */
  .settings-panel{background:var(--white);border-radius:16px;padding:14px 16px;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .settings-label{font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
  .slider-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
  .slider-name{font-size:.82rem;font-weight:600;width:80px;flex-shrink:0;}
  .slider-btns{display:flex;gap:4px;}
  .slider-btn{width:28px;height:28px;border-radius:8px;border:1.5px solid var(--gray2);background:none;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;}
  .slider-btn.active{background:var(--red);color:white;border-color:var(--red);}
  .slider-btn:hover:not(.active){border-color:var(--orange);}

  /* Fullpage modal */
  .fullpage{position:fixed;inset:0;background:var(--gray);z-index:200;display:flex;flex-direction:column;animation:fadeIn .25s ease;}
  .fp-header{background:var(--white);padding:14px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--gray2);flex-shrink:0;position:sticky;top:0;z-index:10;}
  .fp-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;flex:1;line-height:1.2;}
  .fp-body{flex:1;overflow-y:auto;padding:20px;}
  .fp-actions{display:flex;gap:8px;align-items:center;}
  .fp-settings-btn{background:var(--gray);border:none;border-radius:10px;padding:7px 12px;font-size:.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;color:var(--ink);}

  /* AI loading */
  .ai-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:60px 20px;color:var(--muted);}
  .ai-spinner{width:44px;height:44px;border:3px solid var(--gray2);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite;}
  .ai-loading p{font-size:.9rem;font-weight:500;animation:pulse 1.5s infinite;}

  /* Quiz like NotebookLM */
  .quiz-progress{display:flex;gap:3px;margin-bottom:20px;}
  .quiz-dot{flex:1;height:4px;border-radius:2px;background:var(--gray2);transition:background .3s;}
  .quiz-dot.done{background:#22c55e;}
  .quiz-dot.current{background:var(--orange);}
  .quiz-card{background:var(--white);border-radius:20px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,.07);}
  .quiz-q{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;line-height:1.5;margin-bottom:18px;color:var(--ink);}
  .quiz-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;margin-bottom:8px;border:2px solid var(--gray2);border-radius:14px;background:none;font-family:'DM Sans',sans-serif;font-size:.92rem;cursor:pointer;transition:all .2s;}
  .quiz-opt:hover:not(:disabled){border-color:var(--orange);background:#FFF8F3;}
  .quiz-opt.correct{border-color:#22c55e;background:#f0fdf4;color:#166534;}
  .quiz-opt.wrong{border-color:var(--red);background:#fef2f2;color:var(--red-dk);}
  .quiz-opt:disabled{cursor:default;}
  .quiz-letter{width:30px;height:30px;border-radius:9px;background:var(--gray);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0;transition:all .2s;}
  .quiz-opt.correct .quiz-letter{background:#22c55e;color:white;}
  .quiz-opt.wrong .quiz-letter{background:var(--red);color:white;}
  .quiz-exp{font-size:.84rem;color:var(--muted);margin-top:12px;padding:12px 14px;background:#FAFAFA;border-radius:12px;line-height:1.65;border-left:3px solid var(--orange);}
  .quiz-score{display:flex;flex-direction:column;align-items:center;gap:12px;padding:32px 16px;text-align:center;}
  .quiz-score-circle{width:96px;height:96px;border-radius:50%;border:5px solid var(--red);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.6rem;color:var(--red);}
  .quiz-open-input{width:100%;min-height:90px;padding:12px 14px;border:2px solid var(--gray2);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;resize:vertical;transition:border .2s;margin-bottom:10px;}
  .quiz-open-input:focus{border-color:var(--orange);}
  .quiz-reveal{background:#FAFAFA;border-radius:14px;padding:14px;font-size:.88rem;line-height:1.65;border-left:3px solid #22c55e;}

  /* Flash cards */
  .fc-wrap{display:flex;flex-direction:column;gap:12px;}
  .fc-progress{display:flex;gap:3px;margin-bottom:4px;}
  .fc-dot{flex:1;height:3px;border-radius:2px;background:var(--gray2);transition:background .3s;}
  .fc-dot.seen{background:var(--orange);}
  .fc-scene{perspective:1200px;cursor:pointer;user-select:none;}
  .fc-card{width:100%;min-height:210px;position:relative;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.4,0,.2,1);border-radius:24px;}
  .fc-card.flipped{transform:rotateY(180deg);}
  .fc-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 24px;text-align:center;}
  .fc-front{background:linear-gradient(135deg,var(--red) 0%,#D63031 100%);color:white;}
  .fc-back{background:linear-gradient(135deg,var(--dark-bg) 0%,#2D3748 100%);color:white;transform:rotateY(180deg);}
  .fc-label{font-size:.7rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.6;margin-bottom:10px;}
  .fc-text{font-size:1rem;font-weight:600;line-height:1.6;}
  .fc-hint{text-align:center;font-size:.74rem;color:var(--muted);margin-top:6px;}
  .fc-nav{display:flex;justify-content:space-between;align-items:center;}
  .fc-nav button{background:var(--white);border:1.5px solid var(--gray2);border-radius:12px;padding:10px 20px;cursor:pointer;font-weight:600;font-size:.88rem;transition:border-color .2s;font-family:'DM Sans',sans-serif;}
  .fc-nav button:hover:not(:disabled){border-color:var(--orange);}
  .fc-nav button:disabled{opacity:.35;cursor:not-allowed;}
  .fc-counter{color:var(--muted);font-size:.85rem;font-weight:600;}

  /* Mappa concettuale visuale */
  .map-container{display:flex;flex-direction:column;align-items:center;gap:0;padding-bottom:20px;}
  .map-root{background:linear-gradient(135deg,var(--red),#D63031);color:white;border-radius:18px;padding:16px 24px;text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;box-shadow:0 4px 20px rgba(192,40,28,.3);max-width:280px;width:100%;}
  .map-connector-down{width:2px;height:24px;background:var(--gray2);margin:0 auto;}
  .map-branches-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;position:relative;width:100%;}
  .map-branch{display:flex;flex-direction:column;align-items:center;gap:0;flex:1;min-width:140px;max-width:220px;}
  .map-node{background:var(--white);border-radius:14px;padding:12px 14px;text-align:center;font-family:'Syne',sans-serif;font-weight:700;font-size:.85rem;box-shadow:0 3px 14px rgba(0,0,0,.08);cursor:pointer;transition:all .2s;width:100%;border:2px solid var(--gray2);}
  .map-node:hover{border-color:var(--orange);transform:translateY(-2px);}
  .map-node.expanded{border-color:var(--red);background:#FFF5F5;}
  .map-children{display:flex;flex-direction:column;gap:6px;padding:8px 0;width:100%;}
  .map-child{background:var(--gray);border-radius:10px;padding:8px 10px;font-size:.78rem;color:var(--ink);line-height:1.5;text-align:center;animation:popIn .2s ease;}

  /* Riassunto */
  .riassunto-list{display:flex;flex-direction:column;gap:10px;}
  .riassunto-sec{background:var(--white);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .riassunto-sec-hdr{padding:14px 18px;background:var(--white);font-family:'Syne',sans-serif;font-weight:800;font-size:.95rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:2px solid var(--gray);}
  .riassunto-sec-hdr.open{border-bottom-color:var(--red);}
  .riassunto-sec-body{padding:14px 18px;font-size:.88rem;line-height:1.75;color:var(--ink);}
  .riassunto-sec-body ul{padding-left:18px;}
  .riassunto-sec-body li{margin:4px 0;}
  .riassunto-sec-body h3{font-family:'Syne',sans-serif;font-weight:700;font-size:.88rem;margin:10px 0 6px;}

  /* Profilo */
  .profilo-top{background:var(--red);text-align:center;}
  .avatar{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:12px auto;border:3px solid rgba(255,255,255,.4);font-family:'Syne',sans-serif;font-weight:800;color:white;}
  .profilo-name{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;color:white;}
  .profilo-email{color:rgba(255,255,255,.75);font-size:.85rem;margin-top:4px;padding-bottom:20px;}
  .profilo-body{padding:20px;display:flex;flex-direction:column;gap:10px;flex:1;background:var(--gray);}
  .profile-stat{background:var(--white);border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center;}
  .profile-stat-label{font-size:.85rem;color:var(--muted);font-weight:500;}
  .profile-stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;color:var(--ink);}
  .settings-section{background:var(--white);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .settings-row{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--gray);cursor:pointer;transition:background .15s;}
  .settings-row:last-child{border-bottom:none;}
  .settings-row:hover{background:#FAFAFA;}
  .settings-row-label{font-size:.92rem;font-weight:600;}
  .settings-row-icon{color:var(--muted);font-size:.8rem;}
  .btn-admin{background:var(--dark-bg);border:none;border-radius:16px;padding:14px;color:white;font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;transition:opacity .2s;margin-top:4px;}
  .btn-admin:hover{opacity:.85;}

  /* Admin */
  .admin-top{background:var(--dark-bg);padding:0 20px 20px;}
  .admin-top h1{font-family:'Syne',sans-serif;font-weight:800;color:white;font-size:1.5rem;margin-top:12px;line-height:1.2;}
  .admin-top p{color:rgba(255,255,255,.6);font-size:.85rem;margin-top:4px;}
  .admin-body{padding:20px;display:flex;flex-direction:column;gap:14px;flex:1;background:var(--gray);overflow-y:auto;}
  .provider-card{background:var(--white);border-radius:18px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);border-left:4px solid transparent;}
  .provider-card.active-p{border-left-color:var(--orange);}
  .provider-name{font-weight:700;font-size:.95rem;}
  .provider-model{font-size:.78rem;color:var(--muted);margin-top:2px;}
  .provider-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
  .badge-active{background:rgba(34,197,94,.12);color:#16a34a;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;}
  .badge-inactive{background:var(--gray);color:var(--muted);font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;}
  .admin-form{background:var(--white);border-radius:18px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .admin-form h3{font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;margin-bottom:16px;}
  .banner-active{background:rgba(244,124,32,.1);border:1.5px solid var(--orange-lt);border-radius:14px;padding:12px 16px;font-size:.88rem;font-weight:500;}
  .banner-active strong{color:var(--orange);}

  /* Dialog */
  .dialog-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;}
  .dialog-box{background:var(--white);border-radius:24px;padding:28px 24px;width:100%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,.2);}
  .dialog-icon{font-size:2.5rem;text-align:center;margin-bottom:12px;}
  .dialog-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;text-align:center;margin-bottom:8px;line-height:1.3;}
  .dialog-msg{font-size:.88rem;color:var(--muted);text-align:center;line-height:1.6;margin-bottom:20px;}
  .dialog-actions{display:flex;flex-direction:column;gap:8px;}

  /* Sheet */
  .sheet-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s;}
  .sheet{background:var(--white);border-radius:24px 24px 0 0;width:100%;max-width:500px;padding:28px 24px 36px;animation:slideUp .3s cubic-bezier(.22,1,.36,1);max-height:85dvh;overflow-y:auto;}
  .sheet h3{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;margin-bottom:20px;line-height:1.2;}
  .emoji-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:16px;}
  .emoji-opt{font-size:1.4rem;text-align:center;padding:6px;border-radius:10px;cursor:pointer;border:2px solid transparent;transition:border-color .15s;}
  .emoji-opt.sel{border-color:var(--orange);background:#FFF8F3;}

  /* Ripasso */
  .ripasso-body{flex:1;padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;}
  .ripasso-card{background:var(--white);border-radius:18px;padding:18px;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .ripasso-card h4{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;margin-bottom:12px;line-height:1.2;}
  .ripasso-opt{display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:6px;border:1.5px solid var(--gray2);border-radius:12px;background:none;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;font-size:.9rem;}
  .ripasso-opt.sel{border-color:var(--orange);background:#FFF8F3;}
  .ripasso-item{background:var(--white);border-radius:14px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,.05);display:flex;justify-content:space-between;align-items:center;gap:10px;}
  .ripasso-meta{font-size:.75rem;color:var(--muted);margin-top:2px;}

  /* Toast */
  .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--ink);color:white;padding:12px 20px;border-radius:14px;font-size:.88rem;font-weight:600;z-index:500;animation:toastA .3s ease;white-space:nowrap;pointer-events:none;max-width:90vw;text-align:center;}

  /* Empty */
  .empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px 20px;color:var(--muted);text-align:center;}
  .empty span{font-size:2.2rem;}
  .empty p{font-size:.86rem;max-width:220px;line-height:1.5;}

  /* Onboarding */
  .onb-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:600;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
  .onb-card{background:var(--white);border-radius:28px;padding:32px 28px;max-width:380px;width:100%;text-align:center;animation:slideIn .4s ease;}
  .onb-icon{font-size:3.5rem;margin-bottom:16px;}
  .onb-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;color:var(--ink);margin-bottom:10px;line-height:1.2;}
  .onb-desc{font-size:.92rem;color:var(--muted);line-height:1.65;margin-bottom:24px;}
  .onb-dots{display:flex;gap:6px;justify-content:center;margin-bottom:20px;}
  .onb-dot{width:8px;height:8px;border-radius:50%;background:var(--gray2);transition:background .3s;}
  .onb-dot.active{background:var(--red);}

  /* Notifica */
  .notifica{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:var(--dark-bg);color:white;padding:14px 20px;border-radius:18px;font-size:.88rem;font-weight:600;z-index:550;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.3);cursor:pointer;max-width:90vw;animation:slideIn .4s ease;}

  /* Verifiche */
  .verifica-row{background:var(--white);border-radius:14px;display:flex;align-items:center;gap:12px;padding:10px 14px;box-shadow:0 2px 8px rgba(0,0,0,.05);}
  .verifica-thumb{width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0;}

  @media(max-width:380px){.materia-grid,.tools-grid{grid-template-columns:1fr;}}
`

function injectStyles() {
  if (document.getElementById('fb-css')) return
  const el = document.createElement('style')
  el.id='fb-css'; el.textContent=CSS; document.head.appendChild(el)
}

/* ═══ CONSTANTS ═══ */
const EMOJIS=['📚','🔬','🧮','🌍','🎨','📖','🧬','⚗️','🏛️','🎵','🖥️','🌿','📐','🔭','🧠','💡','⚙️','🌊','🦅','🏆']
const PROVIDERS_DEF={
  anthropic:{ name:'Claude (Anthropic)', models:['claude-opus-4-5','claude-sonnet-4-5','claude-haiku-4-5'] },
  openai:   { name:'OpenAI / GPT',       models:['gpt-4o','gpt-4o-mini','o1','o1-mini'] },
  google:   { name:'Google Gemini',      models:['gemini-1.5-flash-latest','gemini-1.5-pro-latest','gemini-2.0-flash'] },
  mistral:  { name:'Mistral AI',         models:['mistral-large-latest','mistral-small-latest','pixtral-large-latest'] },
  deepseek: { name:'DeepSeek',           models:['deepseek-chat','deepseek-reasoner'] },
}
const ONB=[
  {icon:'⚡',title:'Benvenuto in FlashBacon!',desc:'La tua app di studio potenziata dall\'AI. Trasforma i tuoi appunti in riassunti, quiz e flashcard in pochi secondi.'},
  {icon:'📁',title:'Carica le tue fonti',desc:'Foto, PDF, Word, PowerPoint, testo incollato o link a siti web. FlashBacon legge tutto.'},
  {icon:'⚡',title:'Strumenti AI',desc:'Riassunti espandibili, quiz interattivi, flashcard 3D, mappe concettuali e punti chiave — tutto basato sui tuoi materiali.'},
  {icon:'💬',title:'Chat intelligente',desc:'Fai domande sulle tue fonti. L\'AI risponde solo in base al contenuto che hai caricato.'},
  {icon:'📅',title:'Ripasso pianificato',desc:'Pianifica sessioni di ripasso con notifiche. Trovi tutti i quiz generati nello storico.'},
]
const EXT_ICON={pdf:'📄',doc:'📝',docx:'📝',ppt:'📊',pptx:'📊',xls:'📈',xlsx:'📈',txt:'📃',csv:'📃',url:'🔗',text:'✏️'}

/* ═══ HELPERS ═══ */
const SUBJ={
  '📚':{bg:'#EEF2FF',fg:'#4F46E5',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>},
  '🔬':{bg:'#F0FDF4',fg:'#16A34A',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l1 7H8L9 3z"/><path d="M8 10l-4 9h16l-4-9"/><path d="M12 3v4"/></svg>},
  '🧮':{bg:'#FFF7ED',fg:'#EA580C',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>},
  '🌍':{bg:'#F0F9FF',fg:'#0284C7',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>},
  '🎨':{bg:'#FDF4FF',fg:'#A21CAF',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/></svg>},
  '📖':{bg:'#FFF1F2',fg:'#E11D48',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>},
  '🧬':{bg:'#F0FDF4',fg:'#15803D',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3c0 9 14 6 14 15M5 21c0-9 14-6 14-15"/><path d="M5 8h14M5 16h14"/></svg>},
  '⚗️':{bg:'#FFFBEB',fg:'#D97706',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v7L4 19a2 2 0 001.8 2.9h12.4A2 2 0 0020 19l-6-9V3"/></svg>},
  '🏛️':{bg:'#F8FAFC',fg:'#475569',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 10V21M8 10V21M11 10V21M14 10V21M17 10V21M19 10V21M12 3L3 10h18L12 3z"/></svg>},
  '🎵':{bg:'#FDF4FF',fg:'#9333EA',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>},
  '🖥️':{bg:'#EFF6FF',fg:'#2563EB',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>},
  '🌿':{bg:'#F0FDF4',fg:'#16A34A',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.34L2 22"/><path d="M17 8s5 4 5 9c0 2-2 4-4 4-3 0-6-3-6-6s3-6 5-9z"/></svg>},
  '📐':{bg:'#FFF7ED',fg:'#C2410C',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L3 21h18L12 3z"/><path d="M12 3v18M3 21l9-9"/></svg>},
  '🔭':{bg:'#EFF6FF',fg:'#1D4ED8',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M12 2l-5 10 5 10"/><circle cx="19" cy="12" r="3"/></svg>},
  '🧠':{bg:'#FDF4FF',fg:'#7C3AED',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5C8 5 5 8 5 11c0 2 1 3.5 2.5 4.5V19h9v-3.5C18 14.5 19 13 19 11c0-3-3-6-7-6z"/></svg>},
  '💡':{bg:'#FEFCE8',fg:'#CA8A04',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21h6M12 3a6 6 0 016 6c0 2.2-1.2 4.1-3 5.2V17H9v-2.8A6 6 0 0112 3z"/></svg>},
  '⚙️':{bg:'#F1F5F9',fg:'#475569',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>},
  '🌊':{bg:'#EFF6FF',fg:'#0369A1',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/></svg>},
  '🦅':{bg:'#FFF7ED',fg:'#B45309',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8c4 0 6 2 10 2s6-2 10-2"/><path d="M12 10v10M8 16l4 4 4-4"/></svg>},
  '🏆':{bg:'#FEFCE8',fg:'#B45309',svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H3V4h3M18 9h3V4h-3"/><path d="M6 4h12v7a6 6 0 01-12 0V4z"/><path d="M9 21h6M12 17v4"/></svg>},
}

function SubjectIcon({emoji,size=52}){
  const d=SUBJ[emoji]||SUBJ['📚']
  return <div style={{width:size,height:size,background:d.bg,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 2px 8px ${d.fg}22`}}><div style={{width:size*.55,height:size*.55,color:d.fg}}>{d.svg}</div></div>
}
function LogoSVG({size=36}){
  return <div className="logo-icon" style={{width:size,height:size}}><svg viewBox="0 0 58 58" width={size*.75} height={size*.75} xmlns="http://www.w3.org/2000/svg"><path d="M34 5 L16 31 L27 31 L24 53 L44 25 L32 25 Z" fill="#F47C20" stroke="#FAA96A" strokeWidth="1.2"/></svg></div>
}
function Brand({size='1.1rem'}){return <div className="brand-name" style={{fontSize:size}}>Flash<em>Bacon</em></div>}
function Spinner(){return <div className="ai-spinner"/>}

let _tt=null
function toast(msg){const e=document.querySelector('.toast');if(e)e.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);clearTimeout(_tt);_tt=setTimeout(()=>t.remove(),2500)}

function fmtDate(iso){const d=new Date(iso);return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}

async function compressImg(file){
  return new Promise(res=>{
    const img=new Image(),url=URL.createObjectURL(file)
    img.onload=()=>{
      const M=1024;let{width:w,height:h}=img
      if(w>M||h>M){const r=Math.min(M/w,M/h);w=Math.round(w*r);h=Math.round(h*r)}
      const c=document.createElement('canvas');c.width=w;c.height=h
      c.getContext('2d').drawImage(img,0,0,w,h)
      c.toBlob(b=>res(b),'image/jpeg',.75)
      URL.revokeObjectURL(url)
    };img.src=url
  })
}

function getExt(name){return name.split('.').pop()?.toLowerCase()||''}
function isImgExt(ext){return['jpg','jpeg','png','gif','webp'].includes(ext)}

/* ═══ AI OUTPUT PARSERS ═══ */
function parseQuiz(text){
  return text.split('---').map(b=>b.trim()).filter(Boolean).map(block=>{
    const lines=block.split('\n').map(l=>l.trim()).filter(Boolean)
    const dom=lines.find(l=>l.startsWith('DOMANDA:'))?.replace('DOMANDA:','').trim()||''
    const opts=['A','B','C','D'].map(l=>lines.find(ln=>ln.startsWith(l+')'))?.replace(l+')','').trim()||'')
    const corLet=lines.find(l=>l.startsWith('CORRETTA:')||l.startsWith('CORR:'))?.replace(/CORRETTA:|CORR:/,'').trim()||'A'
    const cor=Math.max(0,['A','B','C','D'].indexOf(corLet.toUpperCase().charAt(0)))
    const spieg=lines.find(l=>l.startsWith('SPIEGAZIONE:')||l.startsWith('SPIEG:'))?.replace(/SPIEGAZIONE:|SPIEG:/,'').trim()||''
    return{dom,opts,cor,spieg}
  }).filter(q=>q.dom&&q.opts[0])
}

function parseFC(text){
  return text.split('---').map(b=>b.trim()).filter(Boolean).map(b=>({
    front:b.match(/FRONTE:\s*(.+?)(?:\n|$)/)?.[1]?.trim()||'',
    back:b.match(/RETRO:\s*([\s\S]+?)(?:---|$)/)?.[1]?.replace(/---$/,'').trim()||'',
  })).filter(c=>c.front&&c.back)
}

function parseMappa(text){
  const lines=text.split('\n').filter(l=>l.trim())
  const res={title:'',branches:[]}
  let cur=null
  for(const line of lines){
    const clean=line.replace(/^[#│├└─\s]+/,'').replace(/\*\*/g,'').trim()
    if(!clean)continue
    if(line.match(/^##\s/) && !line.match(/^###/)){res.title=clean}
    else if(line.match(/^###\s/)||line.match(/^[├└]/)){cur={title:clean,children:[]};res.branches.push(cur)}
    else if(cur&&(line.match(/^[-•*]\s/)||line.match(/^\s{2,}/))){cur.children.push(clean)}
  }
  if(!res.title&&lines.length)res.title=lines[0].replace(/^#+\s*/,'').replace(/\*\*/g,'').trim()
  return res
}

function parseRiassunto(text){
  const secs=[];let cur=null
  for(const line of text.split('\n')){
    const t=line.trim().replace(/\*\*/g,'').replace(/^\*+|\*+$/g,'')
    if(t.startsWith('## ')){if(cur)secs.push(cur);cur={title:t.replace('## ',''),items:[]}}
    else if(t.startsWith('### ')&&cur){cur.items.push({type:'h3',text:t.replace('### ','')})}
    else if((t.startsWith('- ')||t.startsWith('• '))&&cur){cur.items.push({type:'li',text:t.replace(/^[-•]\s/,'')})}
    else if(t&&cur){cur.items.push({type:'p',text:t})}
  }
  if(cur)secs.push(cur)
  return secs.length?secs:[{title:'Output',items:[{type:'p',text:text.replace(/\*\*/g,'').replace(/^\*+|\*+$/gm,'')}]}]
}

function cleanText(t){return(t||'').replace(/\*\*/g,'').replace(/^\*+|\*+$/gm,'').replace(/^#+\s*/gm,'').trim()}

/* ═══ SETTINGS WIDGET ═══ */
function AISettings({val,onChange,compact=false}){
  const S=(k,v)=>onChange({...val,[k]:v})
  return(
    <div className="settings-panel">
      {!compact&&<div className="settings-label">Impostazioni risposta AI</div>}
      <div className="slider-row">
        <span className="slider-name">Lunghezza</span>
        <div className="slider-btns">
          {['S','M','L'].map((l,i)=><button key={i} className={`slider-btn ${val.length===(i+1)?'active':''}`} onClick={()=>S('length',i+1)}>{l}</button>)}
        </div>
      </div>
      <div className="slider-row" style={{marginBottom:0}}>
        <span className="slider-name">Dettaglio</span>
        <div className="slider-btns">
          {['1','2','3'].map((l,i)=><button key={i} className={`slider-btn ${val.depth===(i+1)?'active':''}`} onClick={()=>S('depth',i+1)}>{l}</button>)}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
export default function App(){
  useEffect(()=>{injectStyles()},[])

  const [screen,setScreen]=useState('loading')
  const [utente,setUtente]=useState(null)
  const [materie,setMaterie]=useState([])
  const [argomenti,setArgomenti]=useState([])
  const [fonti,setFonti]=useState([])
  const [storico,setStorico]=useState([])
  const [providers,setProviders]=useState([])
  const [ripassi,setRipassi]=useState([])
  const [verifiche,setVerifiche]=useState([])

  const [curMateriaId,setCurMateriaId]=useState(null)
  const [curArgId,setCurArgId]=useState(null)
  const [argTab,setArgTab]=useState('fonti')

  // UI
  const [sheetMat,setSheetMat]=useState(false)
  const [sheetArg,setSheetArg]=useState(false)
  const [sheetQuizCfg,setSheetQuizCfg]=useState(false)
  const [sheetFontePicker,setSheetFontePicker]=useState(false)
  const [sheetTextFonte,setSheetTextFonte]=useState(false)
  const [sheetUrlFonte,setSheetUrlFonte]=useState(false)
  const [sheetRename,setSheetRename]=useState(null)
  const [dialog,setDialog]=useState(null)
  const [fullpage,setFullpage]=useState(null)
  const [fpSettings,setFpSettings]=useState(false)
  const [loginTab,setLoginTab]=useState('accedi')
  const [loginErr,setLoginErr]=useState('')
  const [loading,setLoading]=useState(false)
  const [notifica,setNotifica]=useState(null)
  const [onb,setOnb]=useState(false)
  const [onbStep,setOnbStep]=useState(0)
  const [showDangerZone,setShowDangerZone]=useState(false)

  // Selection
  const [selFonti,setSelFonti]=useState(new Set())
  const [selStorico,setSelStorico]=useState(new Set())
  const [selMaterie,setSelMaterie]=useState(new Set())
  const [selArg,setSelArg]=useState(new Set())

  // Forms
  const [newMatNome,setNewMatNome]=useState('')
  const [newMatEmoji,setNewMatEmoji]=useState('📚')
  const [newArgNome,setNewArgNome]=useState('')
  const [loginEmail,setLoginEmail]=useState('')
  const [loginPass,setLoginPass]=useState('')
  const [regNome,setRegNome]=useState('')
  const [regEmail,setRegEmail]=useState('')
  const [regPass,setRegPass]=useState('')
  const [renameVal,setRenameVal]=useState('')
  const [textFonteVal,setTextFonteVal]=useState('')
  const [urlFonteVal,setUrlFonteVal]=useState('')
  const [quizNum,setQuizNum]=useState(10)
  const [quizDiff,setQuizDiff]=useState('medio')
  const [quizMode,setQuizMode]=useState('multipla')
  const [pendingTool,setPendingTool]=useState(null)
  const [aiSettings,setAiSettings]=useState({length:2,depth:2})
  const [fpAiSettings,setFpAiSettings]=useState({length:2,depth:2})

  // Quiz state
  const [quizData,setQuizData]=useState(null)
  const [quizIdx,setQuizIdx]=useState(0)
  const [quizAnswered,setQuizAnswered]=useState(false)
  const [quizScore,setQuizScore]=useState(0)
  const [openAnswers,setOpenAnswers]=useState({})
  const [openRevealed,setOpenRevealed]=useState({})

  // FC
  const [fcCards,setFcCards]=useState([])
  const [fcIdx,setFcIdx]=useState(0)
  const [fcFlipped,setFcFlipped]=useState(false)

  // Mappa
  const [mappaData,setMappaData]=useState(null)
  const [expandedNodes,setExpandedNodes]=useState(new Set())

  // Riassunto
  const [riassuntoData,setRiassuntoData]=useState(null)
  const [expandedSecs,setExpandedSecs]=useState(new Set())

  // Chat
  const [chatMsgs,setChatMsgs]=useState([])
  const [chatInput,setChatInput]=useState('')
  const [chatLoading,setChatLoading]=useState(false)
  const chatEndRef=useRef(null)

  // Ripasso wizard
  const [rStep,setRStep]=useState(1)
  const [rMat,setRMat]=useState(null)
  const [rArg,setRArg]=useState(null)
  const [rFreq,setRFreq]=useState('settimanale')
  const [rOrario,setROrario]=useState('08:00')
  const [rQNum,setRQNum]=useState(5)
  const [rQMode,setRQMode]=useState('multipla')

  // Admin
  const [newProv,setNewProv]=useState('anthropic')
  const [newModel,setNewModel]=useState('claude-sonnet-4-5')
  const [newKey,setNewKey]=useState('')
  const [adminLoading,setAdminLoading]=useState(false)

  const lpRef=useRef(null)

  /* ── ANDROID BACK ── */
  useEffect(()=>{
    const backMap={argomento:'argomenti',argomenti:'home',profilo:'home',admin:'profilo',ripasso:'home',impostazioni:'profilo'}
    const handler=e=>{
      if(fullpage){e.preventDefault();setFullpage(null);return}
      if(dialog){e.preventDefault();setDialog(null);return}
      const sheets=[sheetMat,sheetArg,sheetQuizCfg,sheetFontePicker,sheetTextFonte,sheetUrlFonte,sheetRename]
      if(sheets.some(Boolean)){e.preventDefault();setSheetMat(false);setSheetArg(false);setSheetQuizCfg(false);setSheetFontePicker(false);setSheetTextFonte(false);setSheetUrlFonte(false);setSheetRename(null);return}
      const next=backMap[screen]
      if(next){e.preventDefault();navTo(next)}
    }
    window.addEventListener('popstate',handler)
    window.history.pushState({},'',window.location.href)
    return()=>window.removeEventListener('popstate',handler)
  },[screen,fullpage,dialog,sheetMat,sheetArg,sheetQuizCfg,sheetFontePicker,sheetTextFonte,sheetUrlFonte,sheetRename])

  /* ── SESSIONS STORAGE ── */
  useEffect(()=>{
    if(screen&&screen!=='loading'&&screen!=='login'){
      sessionStorage.setItem('fb_screen',screen)
      if(curMateriaId)sessionStorage.setItem('fb_mat',curMateriaId)
      if(curArgId)sessionStorage.setItem('fb_arg',curArgId)
    }
  },[screen,curMateriaId,curArgId])

  /* ── AUTH INIT ── */
  useEffect(()=>{
    const t=setTimeout(()=>setScreen('login'),5000)
    supabase.auth.getSession().then(({data:{session}})=>{
      clearTimeout(t)
      if(session)loadUser(session.user)
      else setScreen('login')
    }).catch(()=>{clearTimeout(t);setScreen('login')})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{
      if(s)loadUser(s.user)
      else{setUtente(null);setScreen('login')}
    })
    return()=>subscription.unsubscribe()
  },[])

  /* ── RIPASSO NOTIFICATIONS ── */
  useEffect(()=>{
    if(!ripassi.length)return
    const check=()=>{
      const now=new Date()
      const hhmm=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')
      ripassi.forEach(r=>{
        if(r.orario===hhmm){
          const mat=materie.find(m=>m.id===r.materia_id)
          setNotifica({msg:`📅 Ripasso: ${mat?.nome||'Materia'}`,materiaId:r.materia_id,argomentoId:r.argomento_id})
          setTimeout(()=>setNotifica(null),10000)
          if('Notification' in window&&Notification.permission==='granted'){
            new Notification('⚡ FlashBacon',{body:`Ripasso: ${mat?.nome||''}`,icon:'/favicon.svg'})
          }
        }
      })
    }
    check()// immediate check on mount
    const interval=setInterval(check,60000)
    return()=>clearInterval(interval)
  },[ripassi])

  /* ── DATA LOADERS ── */
  async function loadUser(user){
    try{
      const{data}=await supabase.from('profili').select('*').eq('id',user.id).single()
      const u=data||{id:user.id,nome:user.email.split('@')[0],email:user.email,is_admin:false}
      setUtente(u)
      await loadMaterie(u.email)
      const{data:args}=await supabase.from('argomenti').select('*').order('created_at')
      setArgomenti(args||[])
      await loadRipassi(u.email)
      const isNew=!localStorage.getItem('fb_onb_'+u.id)
      if(isNew){setOnb(true);setOnbStep(0)}
      const ss=sessionStorage.getItem('fb_screen'),sm=sessionStorage.getItem('fb_mat'),sa=sessionStorage.getItem('fb_arg')
      if(ss==='argomento'&&sm&&sa){setCurMateriaId(sm);setCurArgId(sa);await loadFonti(sa);await loadStorico(sa);setScreen('argomento')}
      else if(ss==='argomenti'&&sm){setCurMateriaId(sm);setScreen('argomenti')}
      else setScreen('home')
    }catch{
      const u={id:user.id,nome:user.email.split('@')[0],email:user.email,is_admin:false}
      setUtente(u);setScreen('home')
    }
  }
  async function loadMaterie(email){const{data}=await supabase.from('materie').select('*').eq('utente_email',email).order('created_at');setMaterie(data||[])}
  async function loadArgomenti(mid){const{data}=await supabase.from('argomenti').select('*').eq('materia_id',mid).order('created_at');setArgomenti(prev=>[...prev.filter(a=>a.materia_id!==mid),...(data||[])])}
  async function loadFonti(aid){const{data}=await supabase.from('fonti').select('*').eq('argomento_id',aid).order('created_at');setFonti(data||[])}
  async function loadStorico(aid){const{data}=await supabase.from('storico').select('*').eq('argomento_id',aid).order('created_at',{ascending:false});setStorico(data||[])}
  async function loadProviders(){const{data}=await supabase.from('ai_providers').select('*').order('created_at');setProviders(data||[])}
  async function loadRipassi(email){const{data}=await supabase.from('studio_pianificato').select('*').eq('utente_email',email).order('created_at',{ascending:false});setRipassi(data||[])}
  async function loadVerifiche(mid){const{data}=await supabase.from('verifiche').select('*').eq('materia_id',mid).order('created_at',{ascending:false}).catch(()=>({data:[]}));setVerifiche(data||[])}

  /* ── NAVIGATION ── */
  function navTo(sc){
    setSelFonti(new Set());setSelStorico(new Set());setSelMaterie(new Set());setSelArg(new Set())
    if(sc==='home'){setScreen('home');return}
    if(sc==='argomenti'){loadArgomenti(curMateriaId);setScreen('argomenti');return}
    setScreen(sc)
  }

  /* ── AUTH ── */
  async function doLogin(){setLoginErr('');setLoading(true);const{error}=await supabase.auth.signInWithPassword({email:loginEmail,password:loginPass});setLoading(false);if(error)setLoginErr(error.message)}
  async function doRegister(){if(!regNome){setLoginErr('Inserisci il tuo nome');return}setLoginErr('');setLoading(true);const{data,error}=await supabase.auth.signUp({email:regEmail,password:regPass});if(error){setLoading(false);setLoginErr(error.message);return}if(data.user)await supabase.from('profili').insert({id:data.user.id,nome:regNome,email:regEmail,is_admin:false});setLoading(false)}
  async function doLogout(){await supabase.auth.signOut();sessionStorage.clear();setMaterie([]);setArgomenti([]);setFonti([]);setStorico([])}
  function confirmDeleteAccount(){setDialog({icon:'⚠️',title:'Elimina account',msg:'Tutti i tuoi dati verranno eliminati definitivamente. Questa azione è irreversibile.',confirmLabel:'Sì, elimina tutto',danger:true,onConfirm:async()=>{await supabase.from('profili').delete().eq('id',utente.id);await doLogout()}})}

  /* ── MATERIE ── */
  async function saveMateria(){if(!newMatNome.trim())return;const{data,error}=await supabase.from('materie').insert({utente_email:utente.email,nome:newMatNome.trim(),emoji:newMatEmoji}).select().single();if(!error){setMaterie(p=>[...p,data]);toast('Materia creata ✓')};setSheetMat(false);setNewMatNome('')}
  async function deleteMaterie(ids){for(const id of ids)await supabase.from('materie').delete().eq('id',id);setMaterie(p=>p.filter(m=>!ids.has(m.id)));setSelMaterie(new Set());toast('Eliminato ✓')}
  async function deleteArgomenti(ids){for(const id of ids)await supabase.from('argomenti').delete().eq('id',id);setArgomenti(p=>p.filter(a=>!ids.has(a.id)));setSelArg(new Set());toast('Eliminato ✓')}

  /* ── FONTI ── */
  async function uploadFile(file){
    try{
      const ext=getExt(file.name)
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
      const path=`${utente.id}/${curArgId}/${Date.now()}_${safeName}`
      let blob=file,ct=file.type||'application/octet-stream'
      if(isImgExt(ext)){blob=await compressImg(file);ct='image/jpeg'}
      const{error:ue}=await supabase.storage.from('fonti').upload(path,blob,{contentType:ct})
      if(ue){toast('Errore storage: '+ue.message);console.error('storage',ue);return}
      const{data:{publicUrl}}=supabase.storage.from('fonti').getPublicUrl(path)
      const{data:row,error:ie}=await supabase.from('fonti').insert({
        utente_email:utente.email,
        materia_id:curMateriaId,
        argomento_id:curArgId,
        nome:file.name,
        url:publicUrl,
        tipo:'file'
      }).select().single()
      if(ie){toast('Errore DB: '+ie.message);console.error('insert',ie);return}
      if(row){setFonti(p=>[...p,row]);toast('Caricato: '+file.name)}
    }catch(e){toast('Errore: '+e.message);console.error(e)}
  }
  async function addTextFonte(){
    if(!textFonteVal.trim())return
    const nome='Testo aggiunto '+new Date().toLocaleDateString('it-IT')
    const{data:row}=await supabase.from('fonti').insert({utente_email:utente.email,materia_id:curMateriaId,argomento_id:curArgId,nome,url:'',testo:textFonteVal.trim(),tipo:'text'}).select().single()
    if(row)setFonti(p=>[...p,row]);setSheetTextFonte(false);setTextFonteVal('');toast('Testo aggiunto ✓')
  }
  async function addUrlFonte(){
    const url=urlFonteVal.trim()
    if(!url||!url.startsWith('http'))return
    const nome=url.replace(/^https?:\/\//,'').split('/')[0]
    const{data:row}=await supabase.from('fonti').insert({utente_email:utente.email,materia_id:curMateriaId,argomento_id:curArgId,nome,url,tipo:'url'}).select().single()
    if(row)setFonti(p=>[...p,row]);setSheetUrlFonte(false);setUrlFonteVal('');toast('Link aggiunto ✓')
  }
  async function deleteFonte(f){
    if(f.url&&f.tipo==='file'){const p=f.url.split('/fonti/')[1];if(p)await supabase.storage.from('fonti').remove([decodeURIComponent(p)])}
    await supabase.from('fonti').delete().eq('id',f.id);setFonti(p=>p.filter(x=>x.id!==f.id))
  }
  async function deleteFontiSel(){
    for(const id of selFonti){const f=fonti.find(x=>x.id===id);if(f)await deleteFonte(f)}
    setSelFonti(new Set());toast('Fonti eliminate ✓')
  }
  async function renameFonte(f,nome){await supabase.from('fonti').update({nome}).eq('id',f.id);setFonti(p=>p.map(x=>x.id===f.id?{...x,nome}:x));setSheetRename(null);toast('Rinominato ✓')}

  /* ── STORICO ── */
  async function saveStorico(tipo,contenuto){const{data}=await supabase.from('storico').insert({utente_email:utente.email,materia_id:curMateriaId,argomento_id:curArgId,tipo,contenuto}).select().single();if(data)setStorico(p=>[data,...p])}
  async function deleteStoricoSel(){for(const id of selStorico)await supabase.from('storico').delete().eq('id',id);setStorico(p=>p.filter(s=>!selStorico.has(s.id)));setSelStorico(new Set());toast('Eliminati ✓')}
  async function deleteOneStorico(id){await supabase.from('storico').delete().eq('id',id);setStorico(p=>p.filter(s=>s.id!==id))}

  /* ── PREPARE FONTI FOR AI ── */
  function prepareFonti(){
    const af=fonti.filter(f=>f.argomento_id===curArgId)
    const images=af.filter(f=>f.tipo==='file'&&isImgExt(getExt(f.nome))).map(f=>f.url)
    const pdfs=af.filter(f=>f.tipo==='file'&&getExt(f.nome)==='pdf').map(f=>f.url)
    const textSources=af.filter(f=>f.tipo==='text').map(f=>f.testo||'')
    const urlSources=af.filter(f=>f.tipo==='url').map(f=>f.url)
    // Docs (word, ppt etc) → pass URL to be fetched as text server-side if possible
    const docUrls=af.filter(f=>f.tipo==='file'&&!isImgExt(getExt(f.nome))&&getExt(f.nome)!=='pdf').map(f=>f.url)
    return{images:[...images,...pdfs],textSources,urlSources:[...urlSources,...docUrls]}
  }

  /* ── AI CALL ── */
  async function callAI(prompt,settings=aiSettings){
    const{images,textSources,urlSources}=prepareFonti()
    const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,images,textSources,urlSources,settings})})
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`Errore ${res.status}`)}
    const d=await res.json();return d.result
  }

  /* ── BUILD PROMPTS ── */
  function buildPrompt(key){
    const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
    const base=`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nIn base ESCLUSIVAMENTE al contenuto delle fonti fornite, `
    return{
      riassunto:base+'crea un riassunto strutturato in italiano. Usa ## per le sezioni principali, ### per i sottotitoli, - per i punti. NON usare asterischi iniziali/finali nelle frasi.',
      mappa:base+'crea una mappa concettuale in italiano. Usa ## per il titolo principale, ### per i rami principali, - per i sotto-concetti. NON usare asterischi.',
      punti:base+'estrai i 5 punti chiave più importanti in italiano. Numera 1-5 con titolo in grassetto e spiegazione. NON usare asterischi fuori dal grassetto.',
      flashcards:base+`crea esattamente 10 flash card in italiano.\nFormato RIGOROSO (ogni carta separata da ---):\nFRONTE: [domanda]\nRETRO: [risposta]\n---`,
    }[key]||base+'analizza il contenuto e rispondi.'
  }

  function buildQuizPrompt(num,diff,mode){
    const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
    const dd={facile:'elementari',medio:'di media difficoltà',difficile:'avanzate'}
    if(mode==='multipla')return`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nIn base ESCLUSIVAMENTE alle fonti fornite, crea ${num} domande a risposta multipla ${dd[diff]} in italiano.\n\nFORMATO OBBLIGATORIO (separare con ---):\nDOMANDA: [testo]\nA) [opzione]\nB) [opzione]\nC) [opzione]\nD) [opzione]\nCORRECTA: [A/B/C/D]\nSPIEGAZIONE: [spiegazione breve]\n---`
    return`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nIn base ESCLUSIVAMENTE alle fonti fornite, crea ${num} domande a risposta aperta ${dd[diff]} in italiano.\n\nFORMATO (separare con ---):\nDOMANDA: [testo]\nRISPOSTA: [risposta attesa]\n---`
  }

  /* ── AI TOOLS ── */
  async function runTool(key,settings=aiSettings){
    const af=fonti.filter(f=>f.argomento_id===curArgId)
    if(!af.length&&key!=='chat'){toast('Carica almeno una fonte prima');return}
    if(key==='quiz'||key==='quiz-aperta'){setQuizMode(key==='quiz'?'multipla':'aperta');setPendingTool(key);setSheetQuizCfg(true);return}
    setFullpage({title:{riassunto:'Riassunto',mappa:'Mappa Concettuale',punti:'Punti Chiave',flashcards:'Flash Cards'}[key]||key,type:'loading',data:null})
    try{
      const result=await callAI(buildPrompt(key),settings)
      await saveStorico(key,result)
      if(key==='flashcards'){const c=parseFC(result);setFcCards(c);setFcIdx(0);setFcFlipped(false);setFullpage({title:'Flash Cards',type:'fc',data:c})}
      else if(key==='mappa'){const d=parseMappa(result);setMappaData(d);setExpandedNodes(new Set());setFullpage({title:'Mappa Concettuale',type:'mappa',data:d})}
      else if(key==='riassunto'){const d=parseRiassunto(result);setRiassuntoData(d);setExpandedSecs(new Set(d.map((_,i)=>i)));setFullpage({title:'Riassunto',type:'riassunto',data:d})}
      else setFullpage({title:'Punti Chiave',type:'text',data:result})
    }catch(e){setFullpage({title:'Errore',type:'text',data:`❌ ${e.message}\n\nAssicurati che un provider AI sia attivo nel pannello Admin.`})}
  }

  async function startQuiz(settings=aiSettings){
    setSheetQuizCfg(false)
    setFullpage({title:'Generazione…',type:'loading',data:null})
    try{
      const result=await callAI(buildQuizPrompt(quizNum,quizDiff,quizMode),settings)
      await saveStorico(pendingTool,result)
      if(quizMode==='multipla'){
        const parsed=parseQuiz(result)
        if(parsed.length){setQuizData(parsed);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setFullpage({title:'Quiz',type:'quiz',data:parsed})}
        else setFullpage({title:'Quiz',type:'text',data:result})
      }else{
        const qs=result.split('---').map(b=>b.trim()).filter(Boolean).map(b=>({
          dom:b.match(/DOMANDA:\s*(.+?)(?:\n|$)/)?.[1]?.trim()||'',
          risp:b.match(/RISPOSTA:\s*([\s\S]+?)(?:---|$)/)?.[1]?.replace(/---$/,'').trim()||'',
        })).filter(q=>q.dom)
        setQuizData(qs);setOpenAnswers({});setOpenRevealed({})
        setFullpage({title:'Quiz Aperta',type:'quiz-aperta',data:qs})
      }
    }catch(e){setFullpage({title:'Errore',type:'text',data:`❌ ${e.message}`})}
  }

  /* ── CHAT ── */
  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return
    const msg=chatInput.trim();setChatInput('')
    const newMsgs=[...chatMsgs,{role:'user',content:msg}]
    setChatMsgs(newMsgs);setChatLoading(true)
    try{
      const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
      const history=chatMsgs.slice(-8).map(x=>`${x.role==='user'?'Tu':'AI'}: ${x.content}`).join('\n')
      const prompt=`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nStorico conversazione:\n${history}\n\nTu: ${msg}\n\nRispondi in italiano basandoti SOLO sulle fonti fornite.`
      const result=await callAI(prompt,aiSettings)
      const updated=[...newMsgs,{role:'ai',content:result}]
      setChatMsgs(updated)
      await saveStorico('chat',`Tu: ${msg}\nAI: ${result}`)
    }catch(e){setChatMsgs(p=>[...p,{role:'ai',content:'❌ '+e.message}])}
    setChatLoading(false)
  }
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[chatMsgs])

  /* ── OPEN FROM STORICO ── */
  function openStorico(s){
    if(s.tipo==='chat'){
      // Restore chat conversation
      const lines=s.contenuto.split('\n')
      const msgs=[]
      let cur=null
      for(const line of lines){
        if(line.startsWith('Tu: ')){if(cur)msgs.push(cur);cur={role:'user',content:line.replace('Tu: ','')}}
        else if(line.startsWith('AI: ')){if(cur)msgs.push(cur);cur={role:'ai',content:line.replace('AI: ','')}}
        else if(cur){cur.content+='\n'+line}
      }
      if(cur)msgs.push(cur)
      setChatMsgs(msgs)
      setArgTab('chat')
      toast('Conversazione ripristinata')
      return
    }
    if(s.tipo==='flashcards'){const c=parseFC(s.contenuto);if(c.length){setFcCards(c);setFcIdx(0);setFcFlipped(false);setFullpage({title:'Flash Cards',type:'fc',data:c});return}}
    if(s.tipo==='mappa'){const d=parseMappa(s.contenuto);setMappaData(d);setExpandedNodes(new Set());setFullpage({title:'Mappa Concettuale',type:'mappa',data:d});return}
    if(s.tipo==='riassunto'){const d=parseRiassunto(s.contenuto);setRiassuntoData(d);setExpandedSecs(new Set(d.map((_,i)=>i)));setFullpage({title:'Riassunto',type:'riassunto',data:d});return}
    if(s.tipo==='quiz'){const p=parseQuiz(s.contenuto);if(p.length){setQuizData(p);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setFullpage({title:'Quiz',type:'quiz',data:p});return}}
    setFullpage({title:s.tipo,type:'text',data:s.contenuto})
  }

  /* ── RIPASSO ── */
  async function saveRipasso(settings=aiSettings){
    const{data}=await supabase.from('studio_pianificato').insert({utente_email:utente.email,materia_id:rMat,argomento_id:rArg,frequenza:rFreq,orario:rOrario,difficolta:2,quiz_num:rQNum,quiz_modalita:rQMode}).select().single()
    if(data)setRipassi(p=>[data,...p])
    if('Notification' in window&&Notification.permission==='default')await Notification.requestPermission()
    toast('Ripasso pianificato ✓')
    navTo('home')
  }
  async function deleteRipasso(id){await supabase.from('studio_pianificato').delete().eq('id',id);setRipassi(p=>p.filter(r=>r.id!==id));toast('Eliminato')}
  async function startRipassoQuiz(r){
    setCurMateriaId(r.materia_id);setCurArgId(r.argomento_id)
    await loadFonti(r.argomento_id);await loadStorico(r.argomento_id)
    setQuizMode(r.quiz_modalita||'multipla')
    setQuizNum(r.quiz_num||5)
    setQuizDiff('medio')
    setPendingTool('quiz')
    setScreen('argomento')
    setArgTab('strumenti')
    toast('Carica le fonti e avvia il quiz')
  }

  /* ── ADMIN ── */
  async function addProvider(){if(!newKey.trim()){toast('Inserisci API key');return}setAdminLoading(true);try{const res=await fetch('/api/admin/save-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:newProv,nome_display:PROVIDERS_DEF[newProv].name,modello:newModel,api_key:newKey})});const d=await res.json();if(!res.ok)throw new Error(d.error||'Errore');toast('Provider aggiunto ✓');setNewKey('');await loadProviders()}catch(e){toast('Errore: '+e.message)}setAdminLoading(false)}
  async function activateProvider(id){try{const res=await fetch('/api/admin/set-active',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!res.ok)throw new Error('Errore');toast('Provider attivato ✓');await loadProviders()}catch(e){toast('Errore: '+e.message)}}
  async function deleteProvider(id){try{const res=await fetch('/api/admin/delete-provider',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!res.ok)throw new Error('Errore');toast('Eliminato');await loadProviders()}catch(e){toast('Errore: '+e.message)}}

  /* ── VERIFICHE ── */
  async function uploadVerifica(file){
    try{
      const blob=await compressImg(file)
      const path=`${utente.id}/verifiche/${curMateriaId}/${Date.now()}_${file.name}`
      await supabase.storage.from('fonti').upload(path,blob,{contentType:'image/jpeg'})
      const{data:{publicUrl}}=supabase.storage.from('fonti').getPublicUrl(path)
      // Store in local verifiche table if it exists, otherwise just show
      toast('Verifica caricata ✓')
      setVerifiche(p=>[...p,{id:Date.now(),url:publicUrl,nome:file.name}])
    }catch(e){toast('Errore: '+e.message)}
  }

  /* ══════ COMPUTED ══════ */
  const curMateria=materie.find(m=>m.id===curMateriaId)
  const curArgomento=argomenti.find(a=>a.id===curArgId)
  const activeProvider=providers.find(p=>p.attivo)
  const argFonti=fonti.filter(f=>f.argomento_id===curArgId)
  const argStorico=storico.filter(s=>s.argomento_id===curArgId)

  /* ══════════════════════════════════════════
     JSX
  ══════════════════════════════════════════ */
  return(<>

    {/* LOADING */}
    {screen==='loading'&&<div className="screen" style={{background:'var(--dark-bg)',alignItems:'center',justifyContent:'center',gap:32}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
        <LogoSVG size={96}/><Brand size="2rem"/>
        <div className="loading-bar-track"><div className="loading-bar-fill"/></div>
      </div>
    </div>}

    {/* LOGIN */}
    {screen==='login'&&<div className="screen" style={{background:'var(--red)',alignItems:'center',justifyContent:'center',padding:24}}>
      <div className="login-card">
        <div className="login-header"><LogoSVG size={72}/><Brand size="1.6rem"/><p>Studia più veloce con l'AI</p></div>
        <div className="tabs">
          <button className={`tab ${loginTab==='accedi'?'active':''}`} onClick={()=>{setLoginTab('accedi');setLoginErr('')}}>Accedi</button>
          <button className={`tab ${loginTab==='registrati'?'active':''}`} onClick={()=>{setLoginTab('registrati');setLoginErr('')}}>Registrati</button>
        </div>
        {loginTab==='accedi'?<>
          <div className="field"><label>Email</label><input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
          <div className="field"><label>Password</label><input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
          <button className="btn-primary" onClick={doLogin} disabled={loading}>{loading?'Accesso…':'Accedi'}</button>
        </>:<>
          <div className="field"><label>Nome</label><input type="text" value={regNome} onChange={e=>setRegNome(e.target.value)} placeholder="Il tuo nome"/></div>
          <div className="field"><label>Email</label><input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="tua@email.com"/></div>
          <div className="field"><label>Password</label><input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Min 6 caratteri"/></div>
          <button className="btn-primary" onClick={doRegister} disabled={loading}>{loading?'Creazione…':'Crea account'}</button>
        </>}
        {loginErr&&<div className="error-msg">{loginErr}</div>}
      </div>
    </div>}

    {/* HOME */}
    {screen==='home'&&<div className="screen anim">
      <div className="top-bar">
        <div className="logo-small"><LogoSVG size={36}/><Brand size="1.1rem"/></div>
        <div style={{display:'flex',gap:8}}>
          <button className="icon-btn" onClick={()=>{setRStep(1);setRMat(null);setRArg(null);setScreen('ripasso')}} title="Ripasso">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        </div>
      </div>
      <div className="home-body">
        {selMaterie.size>0&&<div className="sel-bar"><span>{selMaterie.size} selezionate</span><button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina materie',msg:`Eliminare ${selMaterie.size} materie con tutti i loro contenuti?`,confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteMaterie(selMaterie)})}>Elimina</button></div>}
        <div className="section-title">Le tue materie</div>
        <div className="materia-grid">
          {materie.map(m=>(
            <div key={m.id} className="materia-card" onClick={()=>{if(selMaterie.size>0){const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n);return}setCurMateriaId(m.id);loadArgomenti(m.id);setScreen('argomenti')}}
              onContextMenu={e=>{e.preventDefault();const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n)}}
              onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n)},600)}}
              onTouchEnd={()=>clearTimeout(lpRef.current)}
            >
              {selMaterie.size>0&&<div className={`sel-check ${selMaterie.has(m.id)?'checked':''}`}>{selMaterie.has(m.id)&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
              <SubjectIcon emoji={m.emoji}/>
              <div className="materia-name">{m.nome}</div>
              <div className="materia-count">{argomenti.filter(a=>a.materia_id===m.id).length} argomenti</div>
            </div>
          ))}
          <div className="materia-card add-card" onClick={()=>{setNewMatNome('');setNewMatEmoji('📚');setSheetMat(true)}}><span>+</span><p>Nuova materia</p></div>
        </div>
      </div>
      <div className="bottom-bar">
        <button className="bottom-btn active"><svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></svg>Home</button>
        <button className="bottom-btn" onClick={()=>setScreen('profilo')}><svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>Profilo</button>
      </div>
    </div>}

    {/* ARGOMENTI */}
    {screen==='argomenti'&&<div className="screen anim">
      <div className="top-bar">
        <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
        <button className="icon-btn" onClick={()=>{setNewArgNome('');setSheetArg(true)}}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div className="screen-title-bar"><h1>{curMateria?.emoji} {curMateria?.nome}</h1></div>
      <div className="home-body">
        {selArg.size>0&&<div className="sel-bar"><span>{selArg.size} selezionati</span><button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina argomenti',msg:`Eliminare ${selArg.size} argomenti?`,confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteArgomenti(selArg)})}>Elimina</button></div>}
        <div className="argomenti-list">
          {argomenti.filter(a=>a.materia_id===curMateriaId).length===0&&<div className="empty"><span>📝</span><p>Nessun argomento ancora. Creane uno!</p></div>}
          {argomenti.filter(a=>a.materia_id===curMateriaId).map(a=>(
            <div key={a.id} className="argomento-row"
              onClick={()=>{if(selArg.size>0){const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n);return}setCurArgId(a.id);setArgTab('fonti');loadFonti(a.id);loadStorico(a.id);setChatMsgs([]);setScreen('argomento')}}
              onContextMenu={e=>{e.preventDefault();const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)}}
              onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)},600)}}
              onTouchEnd={()=>clearTimeout(lpRef.current)}
            >
              {selArg.size>0&&<div className={`sel-check ${selArg.has(a.id)?'checked':''}`} style={{position:'static',marginRight:4}}>{selArg.has(a.id)&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
              <div className="argomento-name">{a.nome}</div>
              <div className="row-actions">
                <button className="row-del" onClick={e=>{e.stopPropagation();setDialog({icon:'🗑️',title:`Elimina "${a.nome}"?`,msg:'Fonti e storico verranno eliminati.',confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteArgomenti(new Set([a.id]))})}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
                <span style={{color:'var(--muted)'}}>›</span>
              </div>
            </div>
          ))}
        </div>
        {/* Verifiche section */}
        <div style={{marginTop:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div className="section-title" style={{fontSize:'1rem'}}>📋 Verifiche / Test</div>
            <label className="btn-sm" style={{cursor:'pointer'}}>+ Aggiungi<input type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>Array.from(e.target.files).forEach(uploadVerifica)}/></label>
          </div>
          {verifiche.length===0?<div className="empty" style={{padding:'20px 0'}}><span>📋</span><p>Nessuna verifica caricata</p></div>:<div style={{display:'flex',flexDirection:'column',gap:8}}>
            {verifiche.map(v=><div key={v.id} className="verifica-row"><img src={v.url} alt={v.nome} className="verifica-thumb"/><span style={{fontSize:'.85rem',fontWeight:500}}>{v.nome}</span></div>)}
          </div>}
        </div>
      </div>
    </div>}

    {/* ARGOMENTO DETAIL */}
    {screen==='argomento'&&<div className="screen anim">
      <div className="argomento-top">
        <div className="top-bar" style={{background:'transparent',padding:'12px 16px 8px'}}>
          <button className="back-btn" onClick={()=>{loadArgomenti(curMateriaId);setScreen('argomenti')}}>← Argomenti</button>
          <Brand size=".95rem"/>
        </div>
        <div style={{padding:'0 20px'}}><h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.4rem',color:'white',lineHeight:1.2}}>{curArgomento?.nome}</h1></div>
        <div className="argomento-tabs" style={{marginTop:12}}>
          {[['fonti','📁 Fonti'],['strumenti','⚡ Strumenti AI'],['chat','💬 Chat'],['storico','📋 Storico']].map(([k,l])=>(
            <button key={k} className={`arg-tab ${argTab===k?'active':''}`} onClick={()=>setArgTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="arg-body">
        {/* ── FONTI TAB ── */}
        {argTab==='fonti'&&<>
          {selFonti.size>0&&<div className="sel-bar"><span>{selFonti.size} selezionate</span><button className="btn-sm danger" onClick={deleteFontiSel}>Elimina</button></div>}
          {argFonti.length===0&&<div className="empty"><span>📂</span><p>Nessuna fonte. Usa il + in basso per aggiungere.</p></div>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {argFonti.map(f=>{
              const ext=getExt(f.nome)
              const isImg=isImgExt(ext)||(f.tipo==='file'&&f.url?.match(/\.(jpg|jpeg|png|gif|webp)/i))
              const icon=f.tipo==='text'?'✏️':f.tipo==='url'?'🔗':(EXT_ICON[ext]||'📎')
              const isSel=selFonti.has(f.id)
              return(
                <div key={f.id} className="fonte-row" style={{border:isSel?'2px solid var(--red)':'2px solid transparent'}}
                  onContextMenu={e=>{e.preventDefault();const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n)}}
                  onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n)},600)}}
                  onTouchEnd={()=>clearTimeout(lpRef.current)}
                >
                  {selFonti.size>0&&<div className={`sel-check ${isSel?'checked':''}`} style={{position:'static',flexShrink:0}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                  <div className="fonte-preview">
                    {isImg?<img src={f.url} alt={f.nome}/>:<span style={{fontSize:'1.4rem'}}>{icon}</span>}
                  </div>
                  <div className="fonte-name">
                    {f.nome}
                    <span className="fonte-type">{f.tipo==='text'?'Testo incollato':f.tipo==='url'?'Link web':ext.toUpperCase()}</span>
                  </div>
                  <button className="fonte-btn" onClick={()=>{setSheetRename(f);setRenameVal(f.nome)}} title="Rinomina">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="fonte-btn del" onClick={()=>deleteFonte(f)} title="Elimina">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
          {/* FAB */}
          <button className="fab" onClick={()=>setSheetFontePicker(true)}>+</button>
        </>}

        {/* ── STRUMENTI TAB ── */}
        {argTab==='strumenti'&&<>
          {activeProvider?.provider==='deepseek'&&argFonti.some(f=>f.tipo==='file')&&<div style={{background:'rgba(192,40,28,.08)',border:'1.5px solid rgba(192,40,28,.2)',borderRadius:12,padding:'10px 14px',fontSize:'.82rem',color:'var(--red)'}}>⚠️ DeepSeek non supporta file. Solo testo e link funzioneranno.</div>}
          <AISettings val={aiSettings} onChange={setAiSettings}/>
          <div className="tools-grid">
            {[{key:'riassunto',icon:'📝',name:'Riassunto',desc:'Sintesi strutturata espandibile'},
              {key:'quiz',icon:'❓',name:'Quiz multipla',desc:'Domande a scelta multipla'},
              {key:'quiz-aperta',icon:'✍️',name:'Quiz aperta',desc:'Risposta libera con confronto'},
              {key:'flashcards',icon:'🃏',name:'Flash Cards',desc:'Carte FRONTE/RETRO con flip 3D'},
              {key:'mappa',icon:'🗺️',name:'Mappa concett.',desc:'Mappa visuale interattiva'},
              {key:'punti',icon:'🎯',name:'Punti chiave',desc:'Lista 5 concetti fondamentali'},
            ].map(t=>(
              <div key={t.key} className="tool-card" onClick={()=>runTool(t.key)}>
                <div className="tool-icon">{t.icon}</div>
                <div className="tool-name">{t.name}</div>
                <div className="tool-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </>}

        {/* ── CHAT TAB ── */}
        {argTab==='chat'&&<div className="chat-wrap">
          <AISettings val={aiSettings} onChange={setAiSettings} compact/>
          <div className="chat-messages">
            {chatMsgs.length===0&&<div className="empty"><span>💬</span><p>Chatta con l'AI sulle tue fonti. L'AI risponde solo in base al materiale caricato.</p></div>}
            {chatMsgs.map((m,i)=>(
              <div key={i} className={`chat-bubble ${m.role}`}>
                <div className="chat-sender">{m.role==='user'?'Tu':'FlashBacon AI'}</div>
                {m.content}
              </div>
            ))}
            {chatLoading&&<div className="chat-bubble ai"><div style={{display:'flex',gap:6,alignItems:'center'}}><Spinner/><span style={{fontSize:'.85rem'}}>Sto pensando…</span></div></div>}
            <div ref={chatEndRef}/>
          </div>
          <div className="chat-input-row">
            <input className="chat-input" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Fai una domanda sulle fonti…" onKeyDown={e=>e.key==='Enter'&&sendChat()}/>
            <button className="btn-send" onClick={sendChat} disabled={chatLoading}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            </button>
          </div>
        </div>}

        {/* ── STORICO TAB ── */}
        {argTab==='storico'&&<>
          {selStorico.size>0&&<div className="sel-bar"><span>{selStorico.size} selezionati</span><button className="btn-sm danger" onClick={deleteStoricoSel}>Elimina</button></div>}
          {argStorico.length===0&&<div className="empty"><span>📋</span><p>Nessun output ancora</p></div>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {argStorico.map(s=>{
              const isSel=selStorico.has(s.id)
              return(
                <div key={s.id} className={`storico-row ${isSel?'sel':''}`}
                  onContextMenu={e=>{e.preventDefault();const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n)}}
                  onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n)},600)}}
                  onTouchEnd={()=>clearTimeout(lpRef.current)}
                >
                  {selStorico.size>0&&<div className={`sel-check ${isSel?'checked':''}`} style={{position:'static',flexShrink:0}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                  <div className="storico-info">
                    <span className="storico-tipo">{s.tipo}</span>
                    <div className="storico-preview">{cleanText(s.contenuto).substring(0,80)}…</div>
                    <div className="storico-data">{fmtDate(s.created_at)}</div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button className="btn-sm" onClick={()=>openStorico(s)}>Apri</button>
                    <button className="row-del" onClick={()=>deleteOneStorico(s.id)}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
                  </div>
                </div>
              )
            })}
          </div>
          {argStorico.length>0&&<p style={{fontSize:'.73rem',color:'var(--muted)',textAlign:'center'}}>Tieni premuto o click destro per selezionare</p>}
        </>}
      </div>
    </div>}

    {/* PROFILO */}
    {screen==='profilo'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="profilo-top">
        <div className="top-bar" style={{background:'transparent',padding:'12px 16px 0'}}>
          <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
        </div>
        <div className="avatar">{utente?.nome?.[0]?.toUpperCase()||'👤'}</div>
        <div className="profilo-name">{utente?.nome}</div>
        <div className="profilo-email">{utente?.email}</div>
      </div>
      <div className="profilo-body">
        <div className="profile-stat"><span className="profile-stat-label">Materie create</span><span className="profile-stat-val">{materie.length}</span></div>
        <div className="profile-stat"><span className="profile-stat-label">Output AI generati</span><span className="profile-stat-val">{storico.length}</span></div>

        <div className="settings-section">
          <div className="settings-row" onClick={()=>setScreen('impostazioni')}>
            <span className="settings-row-label">⚙️ Impostazioni AI</span><span className="settings-row-icon">›</span>
          </div>
          <div className="settings-row" onClick={()=>{setOnb(true);setOnbStep(0)}}>
            <span className="settings-row-label">📖 Guida FlashBacon</span><span className="settings-row-icon">›</span>
          </div>
          {utente?.is_admin&&<div className="settings-row" onClick={()=>{loadProviders();setScreen('admin')}}>
            <span className="settings-row-label">🔑 Pannello Admin</span><span className="settings-row-icon">›</span>
          </div>}
        </div>

        <button className="btn-secondary" style={{marginTop:0}} onClick={doLogout}>Esci dall'account</button>

        <button style={{background:'none',border:'none',color:'var(--muted)',fontSize:'.8rem',cursor:'pointer',textAlign:'center',padding:'8px',marginTop:4}} onClick={()=>setShowDangerZone(p=>!p)}>
          {showDangerZone?'▲ Nascondi':'▼ Opzioni avanzate'}
        </button>
        {showDangerZone&&<button style={{background:'none',border:'1.5px solid rgba(192,40,28,.3)',borderRadius:16,padding:'12px',color:'var(--red)',fontSize:'.88rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}} onClick={confirmDeleteAccount}>
          🗑️ Elimina account e tutti i dati
        </button>}
      </div>
    </div>}

    {/* IMPOSTAZIONI AI */}
    {screen==='impostazioni'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="top-bar"><button className="back-btn" onClick={()=>setScreen('profilo')}>← Profilo</button></div>
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
        <div className="section-title">Impostazioni Chat AI</div>
        <p style={{fontSize:'.84rem',color:'var(--muted)',marginTop:-6}}>Queste impostazioni si applicano a tutte le risposte dell'AI nelle chat. Puoi sovrascriverle per ogni singolo output dagli Strumenti AI.</p>
        <AISettings val={aiSettings} onChange={setAiSettings}/>
        <div style={{background:'var(--white)',borderRadius:16,padding:16,boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <div className="settings-label" style={{marginBottom:10}}>Provider AI attivo</div>
          {providers.length===0?<p style={{fontSize:'.85rem',color:'var(--muted)'}}>Nessun provider configurato. Vai al Pannello Admin.</p>:providers.filter(p=>p.attivo).map(p=>(
            <div key={p.id}><div style={{fontWeight:700,fontSize:'.9rem'}}>{p.nome_display}</div><div style={{fontSize:'.78rem',color:'var(--muted)',marginTop:2}}>{p.modello}</div></div>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>{toast('Impostazioni salvate ✓');setScreen('profilo')}}>Salva</button>
      </div>
    </div>}

    {/* ADMIN */}
    {screen==='admin'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="admin-top">
        <div className="top-bar" style={{background:'transparent',padding:'12px 16px 0'}}><button className="back-btn" onClick={()=>setScreen('profilo')}>← Profilo</button></div>
        <h1>Pannello Admin</h1><p>Gestisci provider AI</p>
      </div>
      <div className="admin-body">
        {activeProvider&&<div className="banner-active">⚡ Attivo: <strong>{activeProvider.nome_display}</strong> — {activeProvider.modello}</div>}
        {providers.length===0&&<div className="empty"><span>🔑</span><p>Nessun provider. Aggiungine uno.</p></div>}
        {providers.map(p=>(
          <div key={p.id} className={`provider-card ${p.attivo?'active-p':''}`}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div className="provider-name">{p.nome_display}</div><div className="provider-model">{p.modello}</div></div>
              <span className={p.attivo?'badge-active':'badge-inactive'}>{p.attivo?'Attivo':'Inattivo'}</span>
            </div>
            <div className="provider-actions">
              {!p.attivo&&<button className="btn-sm primary" onClick={()=>activateProvider(p.id)}>Attiva</button>}
              <button className="btn-sm danger" onClick={()=>deleteProvider(p.id)}>Elimina</button>
            </div>
          </div>
        ))}
        <div className="admin-form">
          <h3>➕ Aggiungi provider</h3>
          <select className="select-field" value={newProv} onChange={e=>{setNewProv(e.target.value);setNewModel(PROVIDERS_DEF[e.target.value].models[0])}}>
            {Object.entries(PROVIDERS_DEF).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
          </select>
          <select className="select-field" value={newModel} onChange={e=>setNewModel(e.target.value)}>
            {PROVIDERS_DEF[newProv].models.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <div className="field" style={{marginBottom:12}}><label>API Key</label><input type="password" value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="Inserisci chiave API…"/></div>
          <button className="btn-primary" onClick={addProvider} disabled={adminLoading}>{adminLoading?'Salvataggio…':'Salva provider'}</button>
        </div>
      </div>
    </div>}

    {/* RIPASSO */}
    {screen==='ripasso'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="top-bar" style={{background:'var(--dark-bg)'}}><button className="back-btn" onClick={()=>navTo('home')}>← Home</button><Brand size="1rem"/></div>
      <div className="ripasso-body">
        <div className="section-title">📅 Ripasso Pianificato</div>

        {ripassi.length>0&&<>
          <p style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)'}}>PIANIFICATI</p>
          {ripassi.map(r=>{
            const mat=materie.find(m=>m.id===r.materia_id),arg=argomenti.find(a=>a.id===r.argomento_id)
            return(
              <div key={r.id} className="ripasso-item">
                <div>
                  <div style={{fontWeight:600,fontSize:'.9rem'}}>{mat?.emoji} {mat?.nome}</div>
                  <div className="ripasso-meta">{arg?arg.nome:'Tutti'} · {r.frequenza} · {r.orario} · {r.quiz_num} domande {r.quiz_modalita}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn-sm primary" onClick={()=>startRipassoQuiz(r)}>Quiz</button>
                  <button className="btn-sm danger" onClick={()=>deleteRipasso(r.id)}>✕</button>
                </div>
              </div>
            )
          })}
        </>}

        <p style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)',marginTop:4}}>NUOVO RIPASSO</p>
        {rStep===1&&<><div className="ripasso-card"><h4>1. Scegli la materia</h4>{materie.map(m=><button key={m.id} className={`ripasso-opt ${rMat===m.id?'sel':''}`} onClick={()=>setRMat(m.id)}>{m.emoji} {m.nome}</button>)}</div><button className="btn-primary" onClick={()=>setRStep(2)} disabled={!rMat}>Avanti →</button></>}
        {rStep===2&&<><div className="ripasso-card"><h4>2. Argomento</h4><button className={`ripasso-opt ${!rArg?'sel':''}`} onClick={()=>setRArg(null)}>📚 Tutti</button>{argomenti.filter(a=>a.materia_id===rMat).map(a=><button key={a.id} className={`ripasso-opt ${rArg===a.id?'sel':''}`} onClick={()=>setRArg(a.id)}>{a.nome}</button>)}</div><div style={{display:'flex',gap:8}}><button className="btn-secondary" style={{marginTop:0}} onClick={()=>setRStep(1)}>←</button><button className="btn-primary" onClick={()=>setRStep(3)}>Avanti →</button></div></>}
        {rStep===3&&<><div className="ripasso-card"><h4>3. Opzioni</h4>
          <div className="field" style={{marginBottom:12}}><label>Frequenza</label><select className="select-field" value={rFreq} onChange={e=>setRFreq(e.target.value)}><option value="giornaliero">Giornaliero</option><option value="settimanale">Settimanale</option><option value="mensile">Mensile</option></select></div>
          <div className="field" style={{marginBottom:12}}><label>Orario</label><input type="time" className="select-field" value={rOrario} onChange={e=>setROrario(e.target.value)}/></div>
          <div className="field" style={{marginBottom:12}}><label>Numero domande</label><select className="select-field" value={rQNum} onChange={e=>setRQNum(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></div>
          <div className="field" style={{marginBottom:0}}><label>Modalità</label><select className="select-field" value={rQMode} onChange={e=>setRQMode(e.target.value)}><option value="multipla">Risposta multipla</option><option value="aperta">Risposta aperta</option></select></div>
        </div>
        <div style={{display:'flex',gap:8}}><button className="btn-secondary" style={{marginTop:0}} onClick={()=>setRStep(2)}>←</button><button className="btn-primary" onClick={()=>saveRipasso()}>💾 Salva</button></div></>}
      </div>
    </div>}

    {/* ══════ FULLPAGE MODAL ══════ */}
    {fullpage&&<div className="fullpage">
      <div className="fp-header">
        <button className="back-btn" style={{background:'var(--gray)',color:'var(--ink)'}} onClick={()=>{setFullpage(null);setFpSettings(false)}}>← Indietro</button>
        <div className="fp-title">{fullpage.title}</div>
        <div className="fp-actions">
          {fullpage.type!=='loading'&&<button className="fp-settings-btn" onClick={()=>setFpSettings(p=>!p)}>✏️ {fpSettings?'Chiudi':'Modifica'}</button>}
        </div>
      </div>
      {fpSettings&&fullpage.type!=='loading'&&<div style={{padding:'12px 20px 0',background:'var(--white)',borderBottom:'1px solid var(--gray2)'}}>
        <AISettings val={fpAiSettings} onChange={setFpAiSettings} compact/>
        <button className="btn-primary" style={{marginBottom:12}} onClick={()=>{setFpSettings(false);runTool(fullpage.title==='Quiz'?'quiz':fullpage.title==='Flash Cards'?'flashcards':fullpage.title==='Mappa Concettuale'?'mappa':fullpage.title==='Riassunto'?'riassunto':'punti',fpAiSettings)}}>Rigenera con queste impostazioni</button>
      </div>}
      <div className="fp-body">
        {fullpage.type==='loading'&&<div className="ai-loading"><Spinner/><p>L'AI sta elaborando le tue fonti…</p></div>}
        {fullpage.type==='text'&&<div style={{fontSize:'.9rem',lineHeight:1.75,whiteSpace:'pre-wrap',color:'var(--ink)'}}>{cleanText(fullpage.data||'')}</div>}

        {/* RIASSUNTO */}
        {fullpage.type==='riassunto'&&riassuntoData&&<div className="riassunto-list">
          {riassuntoData.map((sec,i)=>(
            <div key={i} className="riassunto-sec">
              <div className={`riassunto-sec-hdr ${expandedSecs.has(i)?'open':''}`} onClick={()=>{const n=new Set(expandedSecs);n.has(i)?n.delete(i):n.add(i);setExpandedSecs(n)}}>
                {sec.title}<span>{expandedSecs.has(i)?'▲':'▼'}</span>
              </div>
              {expandedSecs.has(i)&&<div className="riassunto-sec-body">
                {sec.items.map((it,j)=>
                  it.type==='h3'?<h3 key={j}>{it.text}</h3>:
                  it.type==='li'?<ul key={j}><li>{it.text}</li></ul>:
                  <p key={j}>{it.text}</p>
                )}
              </div>}
            </div>
          ))}
        </div>}

        {/* QUIZ multipla */}
        {fullpage.type==='quiz'&&quizData&&(quizIdx>=quizData.length?(
          <div className="quiz-score">
            <div className="quiz-score-circle">{quizScore}/{quizData.length}</div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem'}}>Quiz completato!</h2>
            <p style={{color:'var(--muted)'}}>Hai risposto correttamente a {quizScore} domande su {quizData.length}.</p>
            <button className="btn-primary" style={{maxWidth:220}} onClick={()=>{setQuizIdx(0);setQuizAnswered(false);setQuizScore(0)}}>Riprova</button>
          </div>
        ):<>
          <div className="quiz-progress">{quizData.map((_,i)=><div key={i} className={`quiz-dot ${i<quizIdx?'done':i===quizIdx?'current':''}`}/>)}</div>
          <QuizQ q={quizData[quizIdx]} idx={quizIdx} total={quizData.length} answered={quizAnswered} setAnswered={setQuizAnswered} onNext={()=>{setQuizIdx(i=>i+1);setQuizAnswered(false)}} onCorrect={()=>setQuizScore(s=>s+1)}/>
        </>)}

        {/* QUIZ aperta */}
        {fullpage.type==='quiz-aperta'&&quizData&&<div style={{display:'flex',flexDirection:'column',gap:18}}>
          {quizData.map((q,i)=>(
            <div key={i} className="quiz-card">
              <div className="quiz-q">{i+1}. {q.dom||q.domanda}</div>
              <textarea className="quiz-open-input" placeholder="Scrivi la tua risposta…" value={openAnswers[i]||''} onChange={e=>setOpenAnswers(p=>({...p,[i]:e.target.value}))}/>
              {!openRevealed[i]?<button className="btn-sm primary" onClick={()=>setOpenRevealed(p=>({...p,[i]:true}))}>Mostra risposta attesa</button>:
              <div className="quiz-reveal"><strong>Risposta attesa:</strong><br/>{cleanText(q.risp||q.risposta||'')}</div>}
            </div>
          ))}
        </div>}

        {/* FLASH CARDS */}
        {fullpage.type==='fc'&&fcCards.length>0&&<div className="fc-wrap">
          <div className="fc-progress">{fcCards.map((_,i)=><div key={i} className={`fc-dot ${i<=fcIdx?'seen':''}`}/>)}</div>
          <div className="fc-scene" onClick={()=>setFcFlipped(f=>!f)}>
            <div className="fc-card" style={{transform:fcFlipped?'rotateY(180deg)':'none',minHeight:210,position:'relative'}}>
              <div className="fc-face fc-front"><div className="fc-label">FRONTE</div><div className="fc-text">{fcCards[fcIdx]?.front}</div></div>
              <div className="fc-face fc-back"><div className="fc-label">RETRO</div><div className="fc-text">{fcCards[fcIdx]?.back}</div></div>
            </div>
          </div>
          <div className="fc-hint">Tocca per girare</div>
          <div className="fc-nav">
            <button onClick={()=>{setFcIdx(i=>Math.max(0,i-1));setFcFlipped(false)}} disabled={fcIdx===0}>← Prec.</button>
            <span className="fc-counter">{fcIdx+1} / {fcCards.length}</span>
            <button onClick={()=>{setFcIdx(i=>Math.min(fcCards.length-1,i+1));setFcFlipped(false)}} disabled={fcIdx===fcCards.length-1}>Succ. →</button>
          </div>
        </div>}

        {/* MAPPA CONCETTUALE VISUALE */}
        {fullpage.type==='mappa'&&mappaData&&<div className="map-container">
          <div className="map-root">{mappaData.title||'Mappa Concettuale'}</div>
          <div className="map-connector-down"/>
          <div className="map-branches-row">
            {(mappaData.branches||[]).map((b,i)=>(
              <div key={i} className="map-branch">
                <div className="map-connector-down"/>
                <div className={`map-node ${expandedNodes.has(i)?'expanded':''}`} onClick={()=>{const n=new Set(expandedNodes);n.has(i)?n.delete(i):n.add(i);setExpandedNodes(n)}}>
                  {b.title}
                  <span style={{fontSize:'.7rem',color:'var(--muted)',display:'block',marginTop:2}}>{b.children?.length?`${b.children.length} concetti`:''}</span>
                </div>
                {expandedNodes.has(i)&&b.children?.length>0&&<div className="map-children">
                  {b.children.map((c,j)=><div key={j} className="map-child">{c}</div>)}
                </div>}
              </div>
            ))}
          </div>
          {(mappaData.branches||[]).length===0&&<p style={{color:'var(--muted)',fontSize:'.85rem',marginTop:16}}>Nessun ramo trovato. Prova a rigenerare.</p>}
        </div>}
      </div>
    </div>}

    {/* ══════ DIALOG ══════ */}
    {dialog&&<div className="dialog-ov" onClick={()=>setDialog(null)}>
      <div className="dialog-box" onClick={e=>e.stopPropagation()}>
        <div className="dialog-icon">{dialog.icon}</div>
        <div className="dialog-title">{dialog.title}</div>
        <div className="dialog-msg">{dialog.msg}</div>
        <div className="dialog-actions">
          <button className="btn-primary" style={{background:dialog.danger?'var(--red)':'var(--dark-bg)'}} onClick={()=>{dialog.onConfirm();setDialog(null)}}>{dialog.confirmLabel||'Conferma'}</button>
          <button className="btn-secondary" style={{marginTop:0}} onClick={()=>setDialog(null)}>Annulla</button>
        </div>
      </div>
    </div>}

    {/* ══════ SHEETS ══════ */}
    {sheetMat&&<div className="sheet-ov" onClick={()=>setSheetMat(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Nuova Materia</h3>
      <div className="emoji-grid">{EMOJIS.map(e=><div key={e} className={`emoji-opt ${newMatEmoji===e?'sel':''}`} onClick={()=>setNewMatEmoji(e)}>{e}</div>)}</div>
      <div className="field"><label>Nome</label><input type="text" value={newMatNome} onChange={e=>setNewMatNome(e.target.value)} placeholder="Es. Matematica" onKeyDown={e=>e.key==='Enter'&&saveMateria()}/></div>
      <button className="btn-primary" onClick={saveMateria}>Crea materia</button>
    </div></div>}

    {sheetArg&&<div className="sheet-ov" onClick={()=>setSheetArg(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Nuovo Argomento</h3>
      <div className="field"><label>Nome</label><input type="text" value={newArgNome} onChange={e=>setNewArgNome(e.target.value)} placeholder="Es. Derivate" onKeyDown={e=>e.key==='Enter'&&saveArgomento()}/></div>
      <button className="btn-primary" onClick={saveArgomento}>Crea argomento</button>
    </div></div>}

    {sheetQuizCfg&&<div className="sheet-ov" onClick={()=>setSheetQuizCfg(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Configura Quiz</h3>
      <div className="field"><label>Numero domande</label><select className="select-field" value={quizNum} onChange={e=>setQuizNum(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></div>
      <div className="field"><label>Difficoltà</label><select className="select-field" value={quizDiff} onChange={e=>setQuizDiff(e.target.value)}><option value="facile">Facile</option><option value="medio">Medio</option><option value="difficile">Difficile</option></select></div>
      <button className="btn-primary" onClick={()=>startQuiz()}>Genera Quiz →</button>
    </div></div>}

    {/* FONTE PICKER */}
    {sheetFontePicker&&<div className="sheet-ov" onClick={()=>setSheetFontePicker(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Aggiungi fonte</h3>
      <div className="fonte-picker">
        {[
          {icon:'🖼️',label:'Galleria',accept:'image/*',multiple:true},
          {icon:'📷',label:'Fotocamera',accept:'image/*',capture:'environment'},
          {icon:'📄',label:'PDF',accept:'.pdf'},
          {icon:'📝',label:'Word',accept:'.doc,.docx'},
          {icon:'📊',label:'PowerPoint',accept:'.ppt,.pptx'},
          {icon:'📈',label:'Excel',accept:'.xls,.xlsx'},
        ].map((t,i)=>(
          <label key={i} className="fonte-type-btn">
            <span>{t.icon}</span><p>{t.label}</p>
            <input type="file" accept={t.accept} multiple={!!t.multiple} capture={t.capture} style={{display:'none'}} onChange={e=>{Array.from(e.target.files).forEach(uploadFile);setSheetFontePicker(false)}}/>
          </label>
        ))}
        <button className="fonte-type-btn" onClick={()=>{setSheetFontePicker(false);setSheetTextFonte(true)}}><span>✏️</span><p>Testo</p></button>
        <button className="fonte-type-btn" onClick={()=>{setSheetFontePicker(false);setSheetUrlFonte(true)}}><span>🔗</span><p>Link web</p></button>
        <label className="fonte-type-btn"><span>📁</span><p>Altro file</p><input type="file" accept="*/*" style={{display:'none'}} onChange={e=>{Array.from(e.target.files).forEach(uploadFile);setSheetFontePicker(false)}}/></label>
      </div>
    </div></div>}

    {sheetTextFonte&&<div className="sheet-ov" onClick={()=>setSheetTextFonte(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>✏️ Aggiungi testo</h3>
      <div className="field"><label>Incolla il testo</label><textarea style={{width:'100%',minHeight:140,padding:'12px 14px',border:'1.5px solid var(--gray2)',borderRadius:12,fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',outline:'none',resize:'vertical'}} value={textFonteVal} onChange={e=>setTextFonteVal(e.target.value)} placeholder="Incolla qui il tuo testo…"/></div>
      <button className="btn-primary" onClick={addTextFonte}>Aggiungi testo</button>
    </div></div>}

    {sheetUrlFonte&&<div className="sheet-ov" onClick={()=>setSheetUrlFonte(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>🔗 Aggiungi link web</h3>
      <div className="field"><label>URL del sito</label><input type="url" value={urlFonteVal} onChange={e=>setUrlFonteVal(e.target.value)} placeholder="https://..." onKeyDown={e=>e.key==='Enter'&&addUrlFonte()}/></div>
      <p style={{fontSize:'.78rem',color:'var(--muted)',marginTop:-8,marginBottom:8}}>L'AI leggerà il contenuto testuale della pagina.</p>
      <button className="btn-primary" onClick={addUrlFonte}>Aggiungi link</button>
    </div></div>}

    {sheetRename&&<div className="sheet-ov" onClick={()=>setSheetRename(null)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Rinomina fonte</h3>
      <div className="field"><label>Nuovo nome</label><input type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renameFonte(sheetRename,renameVal)}/></div>
      <button className="btn-primary" onClick={()=>renameFonte(sheetRename,renameVal)}>Salva</button>
    </div></div>}

    {/* NOTIFICA */}
    {notifica&&<div className="notifica" onClick={()=>{if(notifica.argomentoId){setCurMateriaId(notifica.materiaId);setCurArgId(notifica.argomentoId);loadFonti(notifica.argomentoId);setScreen('argomento')}setNotifica(null)}}>
      <span>{notifica.msg} — Tocca per aprire</span><span>→</span>
    </div>}

    {/* ONBOARDING */}
    {onb&&<div className="onb-ov"><div className="onb-card">
      <div className="onb-icon">{ONB[onbStep].icon}</div>
      <div className="onb-title">{ONB[onbStep].title}</div>
      <div className="onb-desc">{ONB[onbStep].desc}</div>
      <div className="onb-dots">{ONB.map((_,i)=><div key={i} className={`onb-dot ${i===onbStep?'active':''}`}/>)}</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <button className="btn-primary" onClick={()=>{if(onbStep<ONB.length-1)setOnbStep(s=>s+1);else{setOnb(false);localStorage.setItem('fb_onb_'+utente?.id,'1')}}}>
          {onbStep<ONB.length-1?'Avanti →':'Inizia a studiare ⚡'}
        </button>
        <button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'.85rem',padding:'6px'}} onClick={()=>{setOnb(false);localStorage.setItem('fb_onb_'+utente?.id,'1')}}>Salta la guida</button>
      </div>
    </div></div>}

  </>)

  // missing functions
  async function saveArgomento(){if(!newArgNome.trim())return;const{data,error}=await supabase.from('argomenti').insert({materia_id:curMateriaId,nome:newArgNome.trim()}).select().single();if(!error){setArgomenti(p=>[...p,data]);toast('Argomento creato ✓')};setSheetArg(false);setNewArgNome('')}
}

/* ══════════════════════════════════════════
   QUIZ QUESTION COMPONENT
══════════════════════════════════════════ */
function QuizQ({q,idx,total,answered,setAnswered,onNext,onCorrect}){
  const [chosen,setChosen]=useState(null)
  function answer(i){if(answered)return;setChosen(i);setAnswered(true);if(i===q.cor||i===q.corretta)onCorrect?.()}
  return(
    <div className="quiz-card">
      <p style={{fontSize:'.76rem',color:'var(--muted)',fontWeight:600,marginBottom:10}}>Domanda {idx+1} di {total}</p>
      <div className="quiz-q">{q.dom||q.domanda}</div>
      {(q.opts||q.opzioni||[]).map((o,i)=>(
        <button key={i} className={`quiz-opt ${answered?(i===(q.cor??q.corretta)?'correct':i===chosen?'wrong':''):''}`} onClick={()=>answer(i)} disabled={answered}>
          <span className="quiz-letter">{['A','B','C','D'][i]}</span>{o}
        </button>
      ))}
      {answered&&<div className="quiz-exp">💡 {q.spieg||q.spiegazione}</div>}
      {answered&&<button className="btn-primary" style={{marginTop:14}} onClick={onNext}>{idx+1<total?'Prossima →':'Vedi risultato'}</button>}
    </div>
  )
}
