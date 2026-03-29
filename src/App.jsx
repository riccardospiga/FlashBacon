import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'

/* ═══════════════════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
  :root {
    --red:#C0281C; --red-dk:#9A1F14;
    --orange:#F47C20; --orange-lt:#FAA96A;
    --white:#FFFFFF; --gray:#F4F4F4; --gray2:#E4E4E4;
    --ink:#1A1A1A; --muted:#888888; --dark-bg:#1C1C2E;
  }
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

  /* ── Logo ── */
  .logo-icon{background:var(--dark-bg);border-radius:26px;border:1.5px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .brand-name{font-family:'Syne',sans-serif;font-weight:800;color:var(--white);letter-spacing:-.5px;line-height:1.1;}
  .brand-name em{color:var(--orange);font-style:normal;}
  .login-card .brand-name{color:var(--ink);}

  /* ── Loading ── */
  .loading-bar-track{width:220px;height:4px;background:rgba(255,255,255,.12);border-radius:99px;overflow:hidden;}
  .loading-bar-fill{height:100%;background:var(--red);border-radius:99px;animation:loadBar 2.5s ease-in-out forwards;}

  /* ── Login ── */
  .login-card{background:var(--white);border-radius:28px;padding:36px 32px 32px;width:100%;max-width:400px;box-shadow:0 8px 40px rgba(0,0,0,.18);}
  .login-header{display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:28px;}
  .login-header p{color:var(--muted);font-size:.88rem;text-align:center;margin-top:-4px;}
  .tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--gray);border-radius:14px;padding:4px;margin-bottom:24px;}
  .tab{padding:10px;text-align:center;cursor:pointer;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:.9rem;color:var(--muted);border:none;background:none;transition:all .2s;}
  .tab.active{background:var(--white);color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .field{margin-bottom:16px;}
  .field label{display:block;font-size:.82rem;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
  .field input,.select-field{width:100%;padding:14px 16px;background:#F8F9FB;border:1.5px solid var(--gray2);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.95rem;color:var(--ink);outline:none;transition:border .2s;}
  .field input:focus,.select-field:focus{border-color:var(--orange);}
  .select-field{cursor:pointer;margin-bottom:12px;appearance:none;}
  .error-msg{color:var(--red);font-size:.85rem;text-align:center;margin-top:10px;font-weight:500;}

  /* ── Buttons ── */
  .btn-primary{width:100%;padding:15px;background:var(--red);color:var(--white);border:none;border-radius:16px;font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;cursor:pointer;transition:background .2s,transform .1s;margin-top:8px;}
  .btn-primary:hover{background:var(--red-dk);}
  .btn-primary:active{transform:scale(.98);}
  .btn-primary:disabled{opacity:.6;cursor:not-allowed;}
  .btn-secondary{background:none;border:1.5px solid var(--gray2);border-radius:16px;padding:14px;color:var(--ink);font-weight:600;font-size:.95rem;cursor:pointer;width:100%;transition:border-color .2s;margin-top:8px;font-family:'DM Sans',sans-serif;}
  .btn-secondary:hover{border-color:var(--orange);}
  .btn-sm{padding:7px 14px;border-radius:10px;font-size:.8rem;font-weight:600;cursor:pointer;border:1.5px solid var(--gray2);background:none;transition:all .2s;font-family:'DM Sans',sans-serif;}
  .btn-sm.primary{background:var(--red);color:white;border-color:var(--red);}
  .btn-sm.primary:hover{background:var(--red-dk);}
  .btn-sm.danger{color:var(--red);}
  .btn-sm.danger:hover{border-color:var(--red);background:rgba(192,40,28,.05);}
  .btn-sm:hover{border-color:var(--orange);}
  .icon-btn{background:rgba(255,255,255,.15);border:none;border-radius:12px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;transition:background .2s;}
  .icon-btn:hover{background:rgba(255,255,255,.28);}
  .back-btn{background:rgba(255,255,255,.18);border:none;border-radius:12px;padding:8px 14px;color:white;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.9rem;transition:background .2s;}
  .back-btn:hover{background:rgba(255,255,255,.28);}

  /* ── Top bar ── */
  .top-bar{background:var(--red);padding:16px 20px 12px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .logo-small{display:flex;align-items:center;gap:10px;}

  /* ── Home ── */
  .home-body{flex:1;background:var(--gray);border-radius:28px 28px 0 0;padding:24px 20px;margin-top:4px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;}
  .section-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.35rem;color:var(--ink);margin-bottom:4px;line-height:1.2;}
  .materia-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .materia-card{background:var(--white);border-radius:20px;padding:18px 16px;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.08);transition:transform .15s,box-shadow .15s,opacity .2s;display:flex;flex-direction:column;gap:10px;user-select:none;}
  .materia-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.14);}
  .materia-card:active{transform:scale(.97);}
  .materia-card.deleting{opacity:.5;transform:scale(.95);}
  .materia-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;color:var(--ink);line-height:1.3;}
  .materia-count{font-size:.75rem;color:var(--muted);font-weight:500;}
  .add-card{background:rgba(196,40,28,.07);border:2px dashed rgba(196,40,28,.25);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:120px;}
  .add-card span{font-size:1.6rem;color:var(--red);}
  .add-card p{font-size:.82rem;color:var(--red);font-weight:600;}

  /* ── Bottom bar ── */
  .bottom-bar{background:var(--white);border-top:1px solid var(--gray2);display:flex;justify-content:space-around;padding:10px 0 18px;position:sticky;bottom:0;z-index:100;}
  .bottom-btn{display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:6px 16px;color:var(--muted);font-size:.7rem;font-weight:600;transition:color .2s;font-family:'DM Sans',sans-serif;}
  .bottom-btn.active{color:var(--red);}

  /* ── Screen titles ── */
  .screen-title-bar{padding:16px 20px 14px;}
  .screen-title-bar h1{font-family:'Syne',sans-serif;font-weight:800;font-size:1.6rem;color:white;line-height:1.15;}
  .screen-subtitle{color:rgba(255,255,255,.75);font-size:.85rem;margin-top:2px;}

  /* ── Argomenti ── */
  .argomenti-list{display:flex;flex-direction:column;gap:10px;}
  .argomento-card{background:var(--white);border-radius:18px;padding:16px 18px;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:space-between;transition:transform .15s;user-select:none;}
  .argomento-card:hover{transform:translateX(3px);}
  .argomento-name{font-weight:600;font-size:.95rem;}
  .argomento-del{background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;border-radius:8px;transition:color .2s;display:flex;align-items:center;}
  .argomento-del:hover{color:var(--red);}

  /* ── Argomento detail ── */
  .argomento-top{background:var(--red);}
  .argomento-tabs{display:flex;gap:6px;padding:0 16px;overflow-x:auto;scrollbar-width:none;}
  .argomento-tabs::-webkit-scrollbar{display:none;}
  .arg-tab{background:rgba(255,255,255,.18);border:none;border-radius:12px 12px 0 0;padding:10px 16px;color:rgba(255,255,255,.75);font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap;transition:all .2s;flex-shrink:0;font-family:'DM Sans',sans-serif;}
  .arg-tab.active{background:var(--gray);color:var(--ink);}
  .arg-body{flex:1;padding:20px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;background:var(--gray);}

  /* ── Fonti ── */
  .fonti-grid{display:flex;flex-wrap:wrap;gap:10px;}
  .fonte-thumb{width:85px;height:85px;border-radius:14px;border:2px solid var(--gray2);position:relative;overflow:hidden;background:var(--white);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;}
  .fonte-thumb img{width:100%;height:100%;object-fit:cover;}
  .fonte-del{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);border:none;border-radius:6px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;font-size:11px;}
  .fonte-rename{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);border:none;color:white;font-size:.55rem;text-align:center;padding:2px 3px;cursor:pointer;font-family:'DM Sans',sans-serif;}
  .upload-btn-group{display:flex;gap:8px;flex-wrap:wrap;}
  .btn-upload{display:flex;align-items:center;gap:6px;padding:10px 14px;background:var(--white);border:1.5px solid var(--gray2);border-radius:12px;font-size:.83rem;font-weight:600;cursor:pointer;color:var(--ink);transition:border-color .2s,background .2s;font-family:'DM Sans',sans-serif;}
  .btn-upload:hover{border-color:var(--orange);background:#FFF8F3;}

  /* ── Tools ── */
  .tools-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .tool-card{background:var(--white);border-radius:18px;padding:16px;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.08);transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column;gap:6px;}
  .tool-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.14);}
  .tool-card:active{transform:scale(.97);}
  .tool-icon{font-size:1.6rem;}
  .tool-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;line-height:1.2;}
  .tool-desc{font-size:.75rem;color:var(--muted);}

  /* ── Storico ── */
  .storico-item{background:var(--white);border-radius:16px;padding:14px 16px;box-shadow:0 4px 24px rgba(0,0,0,.08);display:flex;flex-direction:column;gap:8px;transition:transform .15s,opacity .2s;user-select:none;}
  .storico-item.selected{border:2px solid var(--red);transform:scale(.99);}
  .storico-header{display:flex;justify-content:space-between;align-items:center;}
  .storico-tipo{background:rgba(196,40,28,.1);color:var(--red);font-size:.75rem;font-weight:700;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.5px;}
  .storico-data{font-size:.75rem;color:var(--muted);}
  .storico-preview{font-size:.85rem;color:var(--ink);line-height:1.5;}
  .storico-actions{display:flex;gap:12px;align-items:center;}
  .storico-btn{background:none;border:none;color:var(--orange);cursor:pointer;font-size:.78rem;font-weight:600;padding:0;transition:color .2s;}
  .storico-btn:hover{color:var(--red);}
  .storico-del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.78rem;font-weight:600;padding:0;transition:color .2s;}
  .storico-del:hover{color:var(--red);}

  /* ── Chat ── */
  .chat-messages{flex:1;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-bottom:8px;min-height:200px;max-height:55vh;}
  .chat-bubble{padding:12px 16px;border-radius:18px;max-width:85%;font-size:.9rem;line-height:1.5;}
  .chat-bubble.user{background:var(--red);color:white;align-self:flex-end;border-radius:18px 18px 4px 18px;}
  .chat-bubble.ai{background:var(--white);color:var(--ink);align-self:flex-start;box-shadow:0 4px 16px rgba(0,0,0,.08);border-radius:18px 18px 18px 4px;}
  .chat-bubble .sender{font-size:.72rem;font-weight:700;opacity:.7;margin-bottom:4px;}
  .chat-input-row{display:flex;gap:8px;}
  .chat-input{flex:1;padding:13px 16px;background:var(--white);border:1.5px solid var(--gray2);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;transition:border .2s;}
  .chat-input:focus{border-color:var(--orange);}
  .btn-send{background:var(--red);border:none;border-radius:14px;width:46px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;transition:background .2s;flex-shrink:0;}
  .btn-send:hover{background:var(--red-dk);}
  .btn-send:disabled{opacity:.6;cursor:not-allowed;}

  /* ── FULLPAGE MODAL (quiz, flashcards, maps) ── */
  .fullpage-modal{position:fixed;inset:0;background:var(--gray);z-index:200;display:flex;flex-direction:column;animation:fadeIn .25s ease;}
  .fullpage-header{background:var(--white);padding:16px 20px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--gray2);flex-shrink:0;position:sticky;top:0;z-index:10;}
  .fullpage-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.15rem;flex:1;line-height:1.2;}
  .fullpage-body{flex:1;overflow-y:auto;padding:24px 20px;}

  /* ── AI Loading ── */
  .ai-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:60px 20px;color:var(--muted);}
  .ai-spinner{width:44px;height:44px;border:3px solid var(--gray2);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite;}
  .ai-loading p{font-size:.9rem;font-weight:500;animation:pulse 1.5s infinite;}

  /* ── Quiz interactive ── */
  .quiz-progress{display:flex;gap:4px;margin-bottom:20px;}
  .quiz-dot{flex:1;height:4px;border-radius:2px;background:var(--gray2);transition:background .3s;}
  .quiz-dot.done{background:var(--red);}
  .quiz-dot.current{background:var(--orange);}
  .quiz-question-card{background:var(--white);border-radius:20px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,.08);margin-bottom:16px;}
  .quiz-q-text{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;line-height:1.5;margin-bottom:18px;color:var(--ink);}
  .quiz-option{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;margin-bottom:8px;border:2px solid var(--gray2);border-radius:14px;background:none;font-family:'DM Sans',sans-serif;font-size:.92rem;cursor:pointer;transition:all .2s;}
  .quiz-option:hover:not(:disabled){border-color:var(--orange);background:#FFF8F3;}
  .quiz-option.correct{border-color:#22c55e;background:#f0fdf4;color:#166534;}
  .quiz-option.wrong{border-color:var(--red);background:#fef2f2;color:var(--red-dk);}
  .quiz-option:disabled{cursor:default;}
  .quiz-letter{width:28px;height:28px;border-radius:8px;background:var(--gray);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0;}
  .quiz-option.correct .quiz-letter{background:#22c55e;color:white;}
  .quiz-option.wrong .quiz-letter{background:var(--red);color:white;}
  .quiz-spieg{font-size:.84rem;color:var(--muted);margin-top:10px;padding:12px 14px;background:var(--gray);border-radius:12px;line-height:1.6;}
  .quiz-open-input{width:100%;min-height:100px;padding:14px;border:2px solid var(--gray2);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.92rem;outline:none;resize:vertical;transition:border .2s;}
  .quiz-open-input:focus{border-color:var(--orange);}
  .quiz-reveal{background:var(--gray);border:2px dashed var(--gray2);border-radius:14px;padding:14px;margin-top:10px;font-size:.88rem;line-height:1.6;color:var(--ink);}

  /* ── Flash Cards ── */
  .fc-container{perspective:1200px;cursor:pointer;user-select:none;margin-bottom:12px;}
  .fc-card{width:100%;min-height:220px;position:relative;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.4,0,.2,1);border-radius:24px;}
  .fc-card.flipped{transform:rotateY(180deg);}
  .card-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 28px;text-align:center;}
  .card-front{background:linear-gradient(135deg,var(--red),#E53E3E);color:white;}
  .card-back{background:linear-gradient(135deg,var(--dark-bg),#2D3748);color:white;transform:rotateY(180deg);}
  .card-label{font-size:.72rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.6;margin-bottom:10px;}
  .card-text{font-size:1rem;font-weight:600;line-height:1.6;}
  .fc-nav{display:flex;justify-content:space-between;align-items:center;}
  .fc-nav button{background:var(--white);border:1.5px solid var(--gray2);border-radius:12px;padding:10px 20px;cursor:pointer;font-weight:600;font-size:.88rem;transition:border-color .2s;font-family:'DM Sans',sans-serif;}
  .fc-nav button:hover:not(:disabled){border-color:var(--orange);}
  .fc-nav button:disabled{opacity:.35;cursor:not-allowed;}
  .fc-counter{color:var(--muted);font-size:.85rem;font-weight:600;}
  .fc-tip{text-align:center;font-size:.75rem;color:var(--muted);margin:8px 0 16px;}
  .fc-progress{display:flex;gap:3px;margin-bottom:16px;}
  .fc-dot{flex:1;height:3px;border-radius:2px;background:var(--gray2);transition:background .3s;}
  .fc-dot.seen{background:var(--orange);}

  /* ── Mappa concettuale interattiva ── */
  .mappa-container{display:flex;flex-direction:column;gap:12px;}
  .mappa-node-main{background:linear-gradient(135deg,var(--red),#E53E3E);color:white;border-radius:18px;padding:18px 20px;text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;}
  .mappa-branches{display:flex;flex-direction:column;gap:8px;padding-left:20px;border-left:3px solid var(--gray2);margin-left:10px;}
  .mappa-node{background:var(--white);border-radius:14px;padding:12px 16px;box-shadow:0 2px 12px rgba(0,0,0,.06);cursor:pointer;transition:all .2s;}
  .mappa-node:hover{box-shadow:0 4px 20px rgba(0,0,0,.12);transform:translateX(3px);}
  .mappa-node-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;display:flex;justify-content:space-between;align-items:center;}
  .mappa-node-children{margin-top:10px;padding-left:14px;border-left:2px solid var(--gray2);display:flex;flex-direction:column;gap:6px;}
  .mappa-child{font-size:.83rem;color:var(--ink);padding:7px 10px;background:var(--gray);border-radius:10px;line-height:1.5;}

  /* ── Riassunto strutturato ── */
  .riassunto-container{display:flex;flex-direction:column;gap:14px;}
  .riassunto-section{background:var(--white);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);}
  .riassunto-section-header{padding:14px 16px;background:var(--red);color:white;font-family:'Syne',sans-serif;font-weight:800;font-size:.95rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;}
  .riassunto-section-body{padding:14px 16px;font-size:.88rem;line-height:1.75;color:var(--ink);}
  .riassunto-section-body ul{padding-left:18px;}
  .riassunto-section-body li{margin:4px 0;}
  .riassunto-section-body strong{font-weight:700;}

  /* ── Profilo ── */
  .profilo-top{background:var(--red);text-align:center;}
  .avatar{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:12px auto;border:3px solid rgba(255,255,255,.4);font-family:'Syne',sans-serif;font-weight:800;color:white;}
  .profilo-name{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;color:white;}
  .profilo-email{color:rgba(255,255,255,.75);font-size:.85rem;margin-top:4px;padding-bottom:20px;}
  .profilo-body{padding:24px 20px;display:flex;flex-direction:column;gap:12px;flex:1;background:var(--gray);}
  .profile-stat{background:var(--white);border-radius:16px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);display:flex;justify-content:space-between;align-items:center;}
  .profile-stat-label{font-size:.85rem;color:var(--muted);font-weight:500;}
  .profile-stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;color:var(--ink);}
  .btn-logout{background:none;border:1.5px solid var(--gray2);border-radius:16px;padding:14px;color:var(--red);font-weight:600;font-size:.95rem;cursor:pointer;transition:background .2s;width:100%;font-family:'DM Sans',sans-serif;}
  .btn-logout:hover{background:rgba(192,40,28,.06);}
  .btn-admin{background:var(--dark-bg);border:none;border-radius:16px;padding:14px;color:white;font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;transition:opacity .2s;}
  .btn-admin:hover{opacity:.85;}
  .btn-danger-outline{background:none;border:1.5px solid var(--red);border-radius:16px;padding:14px;color:var(--red);font-weight:600;font-size:.95rem;cursor:pointer;transition:background .2s;width:100%;font-family:'DM Sans',sans-serif;}
  .btn-danger-outline:hover{background:rgba(192,40,28,.06);}

  /* ── Admin ── */
  .admin-top{background:var(--dark-bg);padding:0 20px 20px;}
  .admin-top h1{font-family:'Syne',sans-serif;font-weight:800;color:white;font-size:1.5rem;margin-top:12px;line-height:1.2;}
  .admin-top p{color:rgba(255,255,255,.6);font-size:.85rem;margin-top:4px;}
  .admin-body{padding:20px;display:flex;flex-direction:column;gap:16px;flex:1;background:var(--gray);overflow-y:auto;}
  .provider-card{background:var(--white);border-radius:18px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);border-left:4px solid transparent;transition:border-color .2s;}
  .provider-card.active-provider{border-left-color:var(--orange);}
  .provider-header{display:flex;justify-content:space-between;align-items:flex-start;}
  .provider-name{font-weight:700;font-size:.95rem;}
  .provider-model{font-size:.78rem;color:var(--muted);margin-top:2px;}
  .provider-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
  .badge-active{background:rgba(34,197,94,.12);color:#16a34a;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;}
  .badge-inactive{background:var(--gray);color:var(--muted);font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;}
  .admin-form{background:var(--white);border-radius:18px;padding:20px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .admin-form h3{font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;margin-bottom:16px;}
  .banner-active{background:rgba(244,124,32,.12);border:1.5px solid var(--orange-lt);border-radius:14px;padding:12px 16px;font-size:.88rem;font-weight:500;}
  .banner-active strong{color:var(--orange);}
  .deepseek-warn{background:rgba(192,40,28,.08);border:1.5px solid rgba(192,40,28,.2);border-radius:12px;padding:10px 14px;font-size:.82rem;color:var(--red);font-weight:500;}

  /* ── Custom Dialog ── */
  .dialog-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;}
  .dialog-box{background:var(--white);border-radius:24px;padding:28px 24px;width:100%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,.25);}
  .dialog-icon{font-size:2.5rem;text-align:center;margin-bottom:12px;}
  .dialog-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;text-align:center;margin-bottom:8px;line-height:1.3;}
  .dialog-msg{font-size:.88rem;color:var(--muted);text-align:center;line-height:1.6;margin-bottom:20px;}
  .dialog-actions{display:flex;flex-direction:column;gap:8px;}

  /* ── Sheet ── */
  .sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s;}
  .sheet{background:var(--white);border-radius:24px 24px 0 0;width:100%;max-width:500px;padding:28px 24px 36px;animation:slideUp .3s cubic-bezier(.22,1,.36,1);max-height:85dvh;overflow-y:auto;}
  .sheet h3{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;margin-bottom:20px;line-height:1.2;}
  .emoji-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:16px;}
  .emoji-opt{font-size:1.4rem;text-align:center;padding:6px;border-radius:10px;cursor:pointer;border:2px solid transparent;transition:border-color .15s;}
  .emoji-opt.selected{border-color:var(--orange);background:#FFF8F3;}

  /* ── Ripasso ── */
  .ripasso-body{flex:1;padding:24px 20px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;}
  .ripasso-card{background:var(--white);border-radius:18px;padding:18px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .ripasso-card h4{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;margin-bottom:12px;line-height:1.2;}
  .ripasso-option{display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:6px;border:1.5px solid var(--gray2);border-radius:12px;background:none;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;font-size:.9rem;}
  .ripasso-option.sel{border-color:var(--orange);background:#FFF8F3;}
  .ripasso-option:hover{border-color:var(--orange);}
  .ripasso-item{background:var(--white);border-radius:14px;padding:14px 16px;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center;}
  .ripasso-item-info{display:flex;flex-direction:column;gap:3px;}
  .ripasso-item-name{font-weight:600;font-size:.92rem;}
  .ripasso-item-meta{font-size:.75rem;color:var(--muted);}

  /* ── Toast ── */
  .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--ink);color:white;padding:12px 20px;border-radius:14px;font-size:.88rem;font-weight:600;z-index:500;animation:toastA .3s ease;white-space:nowrap;pointer-events:none;max-width:90vw;text-align:center;}

  /* ── Empty state ── */
  .empty-state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px;color:var(--muted);text-align:center;}
  .empty-state span{font-size:2.5rem;}
  .empty-state p{font-size:.88rem;max-width:220px;line-height:1.5;}

  /* ── Onboarding ── */
  .onboarding-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:600;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
  .onboarding-card{background:var(--white);border-radius:28px;padding:32px 28px;max-width:380px;width:100%;text-align:center;animation:slideIn .4s ease;}
  .onboarding-icon{font-size:3.5rem;margin-bottom:16px;}
  .onboarding-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;color:var(--ink);margin-bottom:10px;line-height:1.2;}
  .onboarding-desc{font-size:.92rem;color:var(--muted);line-height:1.65;margin-bottom:24px;}
  .onboarding-dots{display:flex;gap:6px;justify-content:center;margin-bottom:20px;}
  .onboarding-dot{width:8px;height:8px;border-radius:50%;background:var(--gray2);transition:background .3s;}
  .onboarding-dot.active{background:var(--red);}

  /* ── Notifica ripasso ── */
  .notifica-banner{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:var(--dark-bg);color:white;padding:14px 20px;border-radius:18px;font-size:.88rem;font-weight:600;z-index:550;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.3);cursor:pointer;max-width:90vw;animation:slideIn .4s ease;}
  .notifica-banner span{flex:1;}

  /* ── Md output ── */
  .md-output{font-size:.9rem;line-height:1.75;color:var(--ink);}
  .md-output h2{font-family:'Syne',sans-serif;font-weight:800;font-size:1.15rem;margin:0 0 12px;line-height:1.2;}
  .md-output h3{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;margin:16px 0 8px;line-height:1.2;}
  .md-output ul{padding-left:20px;margin:6px 0;}
  .md-output li{margin:4px 0;}
  .md-output strong{font-weight:700;}
  .md-output p{margin:8px 0;}
  .md-output hr{border:none;border-top:1px solid var(--gray2);margin:16px 0;}

  @media(max-width:380px){.materia-grid,.tools-grid{grid-template-columns:1fr;}}
`

function injectStyles() {
  if (document.getElementById('fb-styles')) return
  const el = document.createElement('style')
  el.id = 'fb-styles'
  el.textContent = GLOBAL_CSS
  document.head.appendChild(el)
}

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const EMOJIS = ['📚','🔬','🧮','🌍','🎨','📖','🧬','⚗️','🏛️','🎵','🖥️','🌿','📐','🔭','🧠','💡','⚙️','🌊','🦅','🏆']

const PROVIDERS_DEF = {
  anthropic:{ name:'Claude (Anthropic)', models:['claude-opus-4-5','claude-sonnet-4-5','claude-haiku-4-5'] },
  openai:   { name:'OpenAI / GPT',       models:['gpt-4o','gpt-4o-mini','o1','o1-mini','o3-mini'] },
  google:   { name:'Google Gemini',      models:['gemini-1.5-flash-latest','gemini-1.5-pro-latest','gemini-2.0-flash'] },
  mistral:  { name:'Mistral AI',         models:['mistral-large-latest','mistral-small-latest','pixtral-large-latest'] },
  deepseek: { name:'DeepSeek',           models:['deepseek-chat','deepseek-reasoner'] },
}

const TOOL_LABELS = {
  riassunto:'Riassunto', quiz:'Quiz Multipla', 'quiz-aperta':'Quiz Aperta',
  flashcards:'Flash Cards', mappa:'Mappa Concettuale', punti:'Punti Chiave',
}

const ONBOARDING_STEPS = [
  { icon:'⚡', title:'Benvenuto in FlashBacon!', desc:'La tua app di studio potenziata dall\'AI. In pochi secondi puoi trasformare i tuoi appunti in riassunti, quiz e flashcard.' },
  { icon:'📁', title:'Carica le tue fonti', desc:'Fotografa i tuoi appunti, carica PDF o documenti Word. FlashBacon li legge e li usa per generare contenuti di studio.' },
  { icon:'⚡', title:'Strumenti AI', desc:'Con un tap genera riassunti dettagliati, quiz interattivi, flashcard con flip 3D, mappe concettuali e molto altro.' },
  { icon:'💬', title:'Chat intelligente', desc:'Fai domande sulle tue fonti come se parlassi con un professore. L\'AI risponde basandosi sui tuoi materiali.' },
  { icon:'📅', title:'Ripasso pianificato', desc:'Pianifica sessioni di ripasso e ricevi notifiche. Non dimenticare mai più un argomento importante.' },
]

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const SUBJECT_ICONS = {
  '📚':{ bg:'#EEF2FF', fg:'#4F46E5', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg> },
  '🔬':{ bg:'#F0FDF4', fg:'#16A34A', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l1 7H8L9 3z"/><path d="M8 10l-4 9h16l-4-9"/><path d="M12 3v4"/><circle cx="12" cy="17" r="1"/></svg> },
  '🧮':{ bg:'#FFF7ED', fg:'#EA580C', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg> },
  '🌍':{ bg:'#F0F9FF', fg:'#0284C7', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg> },
  '🎨':{ bg:'#FDF4FF', fg:'#A21CAF', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/></svg> },
  '📖':{ bg:'#FFF1F2', fg:'#E11D48', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
  '🧬':{ bg:'#F0FDF4', fg:'#15803D', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3c0 9 14 6 14 15M5 21c0-9 14-6 14-15"/><path d="M5 8h14M5 16h14"/></svg> },
  '⚗️':{ bg:'#FFFBEB', fg:'#D97706', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v7L4 19a2 2 0 001.8 2.9h12.4A2 2 0 0020 19l-6-9V3"/><path d="M7.5 14h9"/></svg> },
  '🏛️':{ bg:'#F8FAFC', fg:'#475569', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 10V21M8 10V21M11 10V21M14 10V21M17 10V21M19 10V21M12 3L3 10h18L12 3z"/></svg> },
  '🎵':{ bg:'#FDF4FF', fg:'#9333EA', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
  '🖥️':{ bg:'#EFF6FF', fg:'#2563EB', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  '🌿':{ bg:'#F0FDF4', fg:'#16A34A', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.34L2 22"/><path d="M17 8C17 8 22 12 22 17C22 19 20 21 18 21C15 21 12 18 12 15C12 12 15 9 17 8Z"/></svg> },
  '📐':{ bg:'#FFF7ED', fg:'#C2410C', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L3 21h18L12 3z"/><path d="M12 3v18M3 21l9-9"/></svg> },
  '🔭':{ bg:'#EFF6FF', fg:'#1D4ED8', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M12 2l-5 10 5 10"/><circle cx="19" cy="12" r="3"/></svg> },
  '🧠':{ bg:'#FDF4FF', fg:'#7C3AED', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5C8 5 5 8 5 11c0 2 1 3.5 2.5 4.5V19h9v-3.5C18 14.5 19 13 19 11c0-3-3-6-7-6z"/></svg> },
  '💡':{ bg:'#FEFCE8', fg:'#CA8A04', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21h6M12 3a6 6 0 016 6c0 2.2-1.2 4.1-3 5.2V17H9v-2.8A6 6 0 0112 3z"/></svg> },
  '⚙️':{ bg:'#F1F5F9', fg:'#475569', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
  '🌊':{ bg:'#EFF6FF', fg:'#0369A1', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/></svg> },
  '🦅':{ bg:'#FFF7ED', fg:'#B45309', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8c4 0 6 2 10 2s6-2 10-2"/><path d="M12 10v10M8 16l4 4 4-4"/></svg> },
  '🏆':{ bg:'#FEFCE8', fg:'#B45309', svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H3V4h3M18 9h3V4h-3"/><path d="M6 4h12v7a6 6 0 01-12 0V4z"/><path d="M9 21h6M12 17v4"/><path d="M8 21h8"/></svg> },
}

function SubjectIcon({ emoji, size=52 }) {
  const def = SUBJECT_ICONS[emoji] || SUBJECT_ICONS['📚']
  return (
    <div style={{ width:size, height:size, background:def.bg, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 2px 8px ${def.fg}22` }}>
      <div style={{ width:size*.55, height:size*.55, color:def.fg }}>{def.svg}</div>
    </div>
  )
}

function LogoSVG({ size=36 }) {
  return (
    <div className="logo-icon" style={{ width:size, height:size }}>
      <svg viewBox="0 0 58 58" width={size*.75} height={size*.75} xmlns="http://www.w3.org/2000/svg">
        <path d="M34 5 L16 31 L27 31 L24 53 L44 25 L32 25 Z" fill="#F47C20" stroke="#FAA96A" strokeWidth="1.2"/>
      </svg>
    </div>
  )
}

function BrandName({ size='1.1rem' }) {
  return <div className="brand-name" style={{ fontSize:size }}>Flash<em>Bacon</em></div>
}

function Spinner() { return <div className="ai-spinner"/> }

let _toastTimer = null
function showToast(msg) {
  const ex = document.querySelector('.toast')
  if (ex) ex.remove()
  const t = document.createElement('div')
  t.className='toast'; t.textContent=msg
  document.body.appendChild(t)
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(()=>t.remove(), 2500)
}

function formatData(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})
}

async function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX=1024; let {width,height}=img
      if(width>MAX||height>MAX){ const r=Math.min(MAX/width,MAX/height); width=Math.round(width*r); height=Math.round(height*r) }
      const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height
      canvas.getContext('2d').drawImage(img,0,0,width,height)
      canvas.toBlob(blob=>resolve(blob),'image/jpeg',.75)
      URL.revokeObjectURL(url)
    }
    img.src=url
  })
}

/* ═══════════════════════════════════════════════
   PARSE AI OUTPUTS
═══════════════════════════════════════════════ */
function parseQuizBlocks(text) {
  const blocks = text.split('---').map(b=>b.trim()).filter(Boolean)
  return blocks.map(block=>{
    const lines = block.split('\n').map(l=>l.trim()).filter(Boolean)
    const domanda = lines.find(l=>l.startsWith('DOMANDA:'))?.replace('DOMANDA:','').trim()||''
    const opzioni = ['A','B','C','D'].map(l=>lines.find(ln=>ln.startsWith(l+')'))?.replace(l+')','').trim()||'')
    const corLetter = lines.find(l=>l.startsWith('CORRETTA:'))?.replace('CORRETTA:','').trim()||'A'
    const corretta = Math.max(0,['A','B','C','D'].indexOf(corLetter))
    const spiegazione = lines.find(l=>l.startsWith('SPIEGAZIONE:'))?.replace('SPIEGAZIONE:','').trim()||''
    return { domanda, opzioni, corretta, spiegazione }
  }).filter(q=>q.domanda&&q.opzioni[0])
}

function parseFlashCardBlocks(text) {
  const blocks = text.split('---').map(b=>b.trim()).filter(Boolean)
  return blocks.map(b=>({
    front: b.match(/FRONTE:\s*(.+?)(?:\n|$)/)?.[1]?.trim()||'',
    back:  b.match(/RETRO:\s*([\s\S]+?)(?:---|$)/)?.[1]?.trim()||'',
  })).filter(c=>c.front&&c.back)
}

function parseMappa(text) {
  // Parse markdown-like map into tree structure
  const lines = text.split('\n').filter(l=>l.trim())
  const result = { title:'', branches:[] }
  let currentBranch = null
  for (const line of lines) {
    const clean = line.replace(/^[#│├└─\s]+/,'').trim()
    if (!clean) continue
    if (line.startsWith('##') && !line.startsWith('###')) {
      result.title = clean
    } else if (line.startsWith('###') || line.match(/^[├└]/)) {
      currentBranch = { title:clean, children:[] }
      result.branches.push(currentBranch)
    } else if (currentBranch && (line.startsWith('-') || line.match(/^\s+/))) {
      currentBranch.children.push(clean)
    }
  }
  if (!result.title && lines.length) result.title = lines[0].replace(/^#+\s*/,'').trim()
  return result
}

function parseRiassunto(text) {
  const sections = []
  let current = null
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: trimmed.replace('## ',''), content:[] }
    } else if (trimmed.startsWith('### ') && current) {
      current.content.push({ type:'h3', text: trimmed.replace('### ','') })
    } else if (trimmed.startsWith('- ') && current) {
      current.content.push({ type:'li', text: trimmed.replace('- ','') })
    } else if (trimmed && current) {
      current.content.push({ type:'p', text: trimmed })
    }
  }
  if (current) sections.push(current)
  return sections.length ? sections : [{ title:'Riassunto', content:[{ type:'p', text }] }]
}

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
export default function App() {
  useEffect(()=>{ injectStyles() },[])

  const [screen, setScreen] = useState('loading')
  const [utente, setUtente] = useState(null)

  const [materie,   setMaterie]   = useState([])
  const [argomenti, setArgomenti] = useState([])
  const [fonti,     setFonti]     = useState([])
  const [storico,   setStorico]   = useState([])
  const [providers, setProviders] = useState([])
  const [ripassi,   setRipassi]   = useState([])

  const [currentMateriaId,   setCurrentMateriaId]   = useState(null)
  const [currentArgomentoId, setCurrentArgomentoId] = useState(null)
  const [argTab, setArgTab] = useState('fonti')

  // UI state
  const [sheetMateria,   setSheetMateria]   = useState(false)
  const [sheetArgomento, setSheetArgomento] = useState(false)
  const [sheetQuizCfg,   setSheetQuizCfg]   = useState(false)
  const [fullpageModal,  setFullpageModal]  = useState(null)  // { title, type, data }
  const [dialog,         setDialog]         = useState(null)  // { icon, title, msg, onConfirm, confirmLabel, confirmDanger }
  const [renameSheet,    setRenameSheet]    = useState(null)  // { fonte }
  const [loginTab,       setLoginTab]       = useState('accedi')
  const [loginError,     setLoginError]     = useState('')
  const [loading,        setLoading]        = useState(false)
  const [notifica,       setNotifica]       = useState(null)  // { msg, argomentoId, materiaId }
  const [onboarding,     setOnboarding]     = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [selectedStorico,setSelectedStorico]= useState(new Set())

  // Form values
  const [newMatNome,  setNewMatNome]  = useState('')
  const [newMatEmoji, setNewMatEmoji] = useState('📚')
  const [newArgNome,  setNewArgNome]  = useState('')
  const [loginEmail,  setLoginEmail]  = useState('')
  const [loginPass,   setLoginPass]   = useState('')
  const [regNome,     setRegNome]     = useState('')
  const [regEmail,    setRegEmail]    = useState('')
  const [regPass,     setRegPass]     = useState('')
  const [quizNum,     setQuizNum]     = useState(10)
  const [quizDiff,    setQuizDiff]    = useState('medio')
  const [quizMode,    setQuizMode]    = useState('multipla')
  const [pendingTool, setPendingTool] = useState(null)
  const [renameVal,   setRenameVal]   = useState('')

  // Quiz state
  const [quizData,     setQuizData]     = useState(null)
  const [quizIdx,      setQuizIdx]      = useState(0)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [openAnswers,  setOpenAnswers]  = useState({})
  const [openRevealed, setOpenRevealed] = useState({})

  // Flashcards
  const [fcCards,   setFcCards]   = useState([])
  const [fcIdx,     setFcIdx]     = useState(0)
  const [fcFlipped, setFcFlipped] = useState(false)

  // Mappa
  const [mappaData,    setMappaData]    = useState(null)
  const [expandedNodes,setExpandedNodes]= useState(new Set())

  // Riassunto
  const [riassuntoData, setRiassuntoData] = useState(null)
  const [expandedSects, setExpandedSects] = useState(new Set())

  // Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput,    setChatInput]    = useState('')
  const [chatLoading,  setChatLoading]  = useState(false)
  const chatEndRef = useRef(null)

  // Admin
  const [newProvider,  setNewProvider]  = useState('anthropic')
  const [newModel,     setNewModel]     = useState('claude-sonnet-4-5')
  const [newApiKey,    setNewApiKey]    = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // Ripasso wizard
  const [ripassoStep,   setRipassoStep]   = useState(1)
  const [ripassoMat,    setRipassoMat]    = useState(null)
  const [ripassoArg,    setRipassoArg]    = useState(null)
  const [ripassoFreq,   setRipassoFreq]   = useState('settimanale')
  const [ripassoOrario, setRipassoOrario] = useState('08:00')
  const [ripassoQNum,   setRipassoQNum]   = useState(5)
  const [ripassoQMode,  setRipassoQMode]  = useState('multipla')

  // Long press
  const longPressTimer = useRef(null)

  /* ── ANDROID BACK BUTTON ── */
  useEffect(()=>{
    const backMap = {
      argomento:'argomenti', argomenti:'home', profilo:'home',
      admin:'profilo', ripasso:'home', quiz_full:'argomento',
    }
    const handler = (e)=>{
      if (fullpageModal) { e.preventDefault(); setFullpageModal(null); return }
      if (dialog)        { e.preventDefault(); setDialog(null); return }
      if (sheetMateria||sheetArgomento||sheetQuizCfg||renameSheet) {
        e.preventDefault()
        setSheetMateria(false); setSheetArgomento(false)
        setSheetQuizCfg(false); setRenameSheet(null)
        return
      }
      const next = backMap[screen]
      if (next) { e.preventDefault(); navTo(next) }
    }
    window.addEventListener('popstate', handler)
    // Push a state so popstate fires
    window.history.pushState({},'',window.location.href)
    return ()=> window.removeEventListener('popstate', handler)
  },[screen, fullpageModal, dialog, sheetMateria, sheetArgomento, sheetQuizCfg, renameSheet])

  /* ── AUTH INIT ── */
  useEffect(()=>{
    const timeout = setTimeout(()=>setScreen('login'), 5000)
    supabase.auth.getSession().then(({ data:{ session }})=>{
      clearTimeout(timeout)
      if (session) loadUser(session.user)
      else setScreen('login')
    }).catch(()=>{ clearTimeout(timeout); setScreen('login') })
    const { data:{ subscription }} = supabase.auth.onAuthStateChange((_e,session)=>{
      if (session) loadUser(session.user)
      else { setUtente(null); setScreen('login') }
    })
    return ()=> subscription.unsubscribe()
  },[])

  /* ── RIPASSO NOTIFICATIONS ── */
  useEffect(()=>{
    if (!ripassi.length) return
    const checkRipasso = ()=>{
      const now = new Date()
      const hhmm = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')
      ripassi.forEach(r=>{
        if (r.orario===hhmm) {
          const mat = materie.find(m=>m.id===r.materia_id)
          setNotifica({ msg:`📅 Ripasso: ${mat?.nome||'Materia'}`, materiaId:r.materia_id, argomentoId:r.argomento_id })
          setTimeout(()=>setNotifica(null), 10000)
        }
      })
    }
    const interval = setInterval(checkRipasso, 60000)
    return ()=> clearInterval(interval)
  },[ripassi, materie])

  /* ── SESSION STORAGE PERSISTENCE ── */
  useEffect(()=>{
    if (screen && screen!=='loading' && screen!=='login') {
      sessionStorage.setItem('fb_screen', screen)
      if (currentMateriaId)   sessionStorage.setItem('fb_materia',   currentMateriaId)
      if (currentArgomentoId) sessionStorage.setItem('fb_argomento', currentArgomentoId)
    }
  },[screen, currentMateriaId, currentArgomentoId])

  /* ── DATA LOADERS ── */
  async function loadUser(user) {
    try {
      const { data } = await supabase.from('profili').select('*').eq('id',user.id).single()
      const u = data || { id:user.id, nome:user.email.split('@')[0], email:user.email, is_admin:false }
      setUtente(u)
      await loadMaterie(u.email)
      await loadAllArgomenti(u.email)
      await loadRipassi(u.email)

      // Onboarding for new users
      const isNew = !localStorage.getItem('fb_onboarded_'+u.id)
      if (isNew) { setOnboarding(true); setOnboardingStep(0) }

      // Restore nav
      const savedScreen    = sessionStorage.getItem('fb_screen')
      const savedMateriaId = sessionStorage.getItem('fb_materia')
      const savedArgId     = sessionStorage.getItem('fb_argomento')

      if (savedScreen==='argomento'&&savedMateriaId&&savedArgId) {
        setCurrentMateriaId(savedMateriaId); setCurrentArgomentoId(savedArgId)
        await loadFonti(savedArgId); await loadStorico(savedArgId)
        setScreen('argomento')
      } else if (savedScreen==='argomenti'&&savedMateriaId) {
        setCurrentMateriaId(savedMateriaId)
        await loadArgomenti(savedMateriaId)
        setScreen('argomenti')
      } else {
        setScreen('home')
      }
    } catch {
      const u = { id:user.id, nome:user.email.split('@')[0], email:user.email, is_admin:false }
      setUtente(u); setScreen('home')
    }
  }

  async function loadMaterie(email) {
    const { data } = await supabase.from('materie').select('*').eq('utente_email',email).order('created_at')
    setMaterie(data||[])
  }
  async function loadAllArgomenti(email) {
    const { data } = await supabase.from('argomenti').select('*').order('created_at')
    setArgomenti(data||[])
  }
  async function loadArgomenti(materiaId) {
    const { data } = await supabase.from('argomenti').select('*').eq('materia_id',materiaId).order('created_at')
    setArgomenti(prev=>{ const other=prev.filter(a=>a.materia_id!==materiaId); return [...other,...(data||[])] })
  }
  async function loadFonti(argomentoId) {
    const { data } = await supabase.from('fonti').select('*').eq('argomento_id',argomentoId).order('created_at')
    setFonti(data||[])
  }
  async function loadStorico(argomentoId) {
    const { data } = await supabase.from('storico').select('*').eq('argomento_id',argomentoId).order('created_at',{ascending:false})
    setStorico(data||[])
  }
  async function loadProviders() {
    const { data } = await supabase.from('ai_providers').select('id,provider,nome_display,modello,attivo,created_at').order('created_at')
    setProviders(data||[])
  }
  async function loadRipassi(email) {
    const { data } = await supabase.from('studio_pianificato').select('*').eq('utente_email',email).order('created_at',{ascending:false})
    setRipassi(data||[])
  }

  /* ── NAVIGATION ── */
  function navTo(sc) {
    if (sc==='home') { setScreen('home'); return }
    if (sc==='argomenti') { loadArgomenti(currentMateriaId); setScreen('argomenti'); return }
    setScreen(sc)
  }

  /* ── AUTH ── */
  async function doLogin() {
    setLoginError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email:loginEmail, password:loginPass })
    setLoading(false)
    if (error) setLoginError(error.message)
  }
  async function doRegister() {
    if (!regNome) { setLoginError('Inserisci il tuo nome'); return }
    setLoginError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email:regEmail, password:regPass })
    if (error) { setLoading(false); setLoginError(error.message); return }
    if (data.user) await supabase.from('profili').insert({ id:data.user.id, nome:regNome, email:regEmail, is_admin:false })
    setLoading(false)
  }
  async function doLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    setMaterie([]); setArgomenti([]); setFonti([]); setStorico([])
  }
  function confirmDeleteAccount() {
    setDialog({
      icon:'⚠️', title:'Elimina account',
      msg:'Tutti i tuoi dati (materie, argomenti, storico) verranno eliminati. Questa azione è irreversibile.',
      confirmLabel:'Elimina definitivamente', confirmDanger:true,
      onConfirm: async ()=>{
        await supabase.from('profili').delete().eq('id',utente.id)
        await supabase.auth.admin?.deleteUser(utente.id).catch(()=>{})
        await doLogout()
      }
    })
  }

  /* ── MATERIE ── */
  async function saveMateria() {
    if (!newMatNome.trim()) return
    const { data, error } = await supabase.from('materie').insert({ utente_email:utente.email, nome:newMatNome.trim(), emoji:newMatEmoji }).select().single()
    if (!error) { setMaterie(prev=>[...prev,data]); showToast('Materia creata ✓') }
    setSheetMateria(false); setNewMatNome('')
  }
  function startLongPressMateria(id) {
    longPressTimer.current = setTimeout(()=>{
      const m = materie.find(x=>x.id===id)
      setDialog({
        icon:'🗑️', title:`Elimina "${m?.nome}"?`,
        msg:'Tutti gli argomenti e le fonti di questa materia verranno eliminati.',
        confirmLabel:'Elimina', confirmDanger:true,
        onConfirm:()=>deleteMateria(id)
      })
    }, 600)
  }
  function cancelLongPress() { clearTimeout(longPressTimer.current) }
  async function deleteMateria(id) {
    await supabase.from('materie').delete().eq('id',id)
    setMaterie(prev=>prev.filter(m=>m.id!==id))
    showToast('Materia eliminata')
  }

  /* ── ARGOMENTI ── */
  async function saveArgomento() {
    if (!newArgNome.trim()) return
    const { data, error } = await supabase.from('argomenti').insert({ materia_id:currentMateriaId, nome:newArgNome.trim() }).select().single()
    if (!error) { setArgomenti(prev=>[...prev,data]); showToast('Argomento creato ✓') }
    setSheetArgomento(false); setNewArgNome('')
  }
  function confirmDeleteArgomento(id) {
    const a = argomenti.find(x=>x.id===id)
    setDialog({
      icon:'🗑️', title:`Elimina "${a?.nome}"?`,
      msg:'Tutte le fonti e lo storico di questo argomento verranno eliminati.',
      confirmLabel:'Elimina', confirmDanger:true,
      onConfirm:async()=>{
        await supabase.from('argomenti').delete().eq('id',id)
        setArgomenti(prev=>prev.filter(a=>a.id!==id))
        showToast('Argomento eliminato')
      }
    })
  }

  /* ── FONTI ── */
  async function handleUpload(files, mode='image') {
    for (const file of Array.from(files)) {
      try {
        const path=`${utente.id}/${currentArgomentoId}/${Date.now()}_${file.name}`
        let uploadBlob=file, contentType=file.type||'application/octet-stream'
        if (file.type.startsWith('image/')) { uploadBlob=await compressImage(file); contentType='image/jpeg' }
        const { error:upErr } = await supabase.storage.from('fonti').upload(path, uploadBlob, { contentType })
        if (upErr) { showToast('Errore: '+upErr.message); continue }
        const { data:{ publicUrl }} = supabase.storage.from('fonti').getPublicUrl(path)
        const { data:row } = await supabase.from('fonti').insert({ utente_email:utente.email, materia_id:currentMateriaId, argomento_id:currentArgomentoId, nome:file.name, url:publicUrl }).select().single()
        if (row) setFonti(prev=>[...prev,row])
        showToast(`${file.name} caricato ✓`)
      } catch(e) { showToast('Errore: '+e.message) }
    }
  }
  async function deleteFonte(fonte) {
    const path = fonte.url.split('/fonti/')[1]
    if (path) await supabase.storage.from('fonti').remove([decodeURIComponent(path)])
    await supabase.from('fonti').delete().eq('id',fonte.id)
    setFonti(prev=>prev.filter(f=>f.id!==fonte.id))
  }
  async function renameFonte(fonte, newName) {
    await supabase.from('fonti').update({ nome:newName }).eq('id',fonte.id)
    setFonti(prev=>prev.map(f=>f.id===fonte.id?{...f,nome:newName}:f))
    setRenameSheet(null)
    showToast('Rinominato ✓')
  }

  /* ── STORICO ── */
  async function saveStorico(tipo, contenuto) {
    const { data } = await supabase.from('storico').insert({ utente_email:utente.email, materia_id:currentMateriaId, argomento_id:currentArgomentoId, tipo, contenuto }).select().single()
    if (data) setStorico(prev=>[data,...prev])
  }
  async function deleteStorico(id) {
    await supabase.from('storico').delete().eq('id',id)
    setStorico(prev=>prev.filter(s=>s.id!==id))
  }
  async function deleteSelectedStorico() {
    for (const id of selectedStorico) {
      await supabase.from('storico').delete().eq('id',id)
    }
    setStorico(prev=>prev.filter(s=>!selectedStorico.has(s.id)))
    setSelectedStorico(new Set())
    showToast('Eliminati ✓')
  }
  function toggleStoricoSelect(id) {
    setSelectedStorico(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  /* ── AI CALL ── */
  async function callAI(prompt, imgUrls=[]) {
    const res = await fetch('/api/ai', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, images:imgUrls }),
    })
    if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error||`Errore ${res.status}`) }
    const data = await res.json()
    return data.result
  }

  /* ── BUILD AI PROMPTS ── */
  function buildPrompt(key, fontiList) {
    const args = argomenti.find(a=>a.id===currentArgomentoId)
    const mat  = materie.find(m=>m.id===currentMateriaId)
    const base = `Sei un assistente di studio esperto. Stai aiutando uno studente con l'argomento "${args?.nome}" della materia "${mat?.nome}". Analizza il contenuto delle fonti fornite e `
    const prompts = {
      riassunto: base+'crea un riassunto dettagliato in italiano. Usa ## per le sezioni principali, ### per i sottotitoli e - per i punti elenco. Il riassunto deve essere completo e facile da studiare.',
      mappa:     base+'crea una mappa concettuale testuale in italiano. Usa ## per il tema centrale, ### per i concetti principali e - per i sottoconcetti con struttura ad albero.',
      punti:     base+'estrai i 5 punti chiave più importanti in italiano. Numera da 1 a 5, metti in grassetto il titolo di ogni punto con una spiegazione.',
      flashcards:base+`crea esattamente 10 flash card in italiano. Formato RIGOROSO:\nFRONTE: [domanda]\nRETRO: [risposta]\n---\nSepara ogni carta con ---`,
    }
    return prompts[key]||base+'analizza il contenuto e fornisci informazioni utili.'
  }

  function buildQuizPrompt(num, diff, mode) {
    const args=argomenti.find(a=>a.id===currentArgomentoId)
    const mat=materie.find(m=>m.id===currentMateriaId)
    const diffDesc={facile:'semplici e di base',medio:'di media difficoltà',difficile:'avanzate e approfondite'}
    if (mode==='multipla') {
      return `Sei un assistente di studio. Crea ${num} domande a risposta multipla ${diffDesc[diff]} in italiano sull'argomento "${args?.nome}" della materia "${mat?.nome}" basandoti sul contenuto delle fonti.\n\nFORMATO OBBLIGATORIO:\nDOMANDA: [testo]\nA) [opzione]\nB) [opzione]\nC) [opzione]\nD) [opzione]\nCORRECTA: [A, B, C o D]\nSPIEGAZIONE: [spiegazione]\n---\n\nGenera esattamente ${num} domande separate da ---`
    }
    return `Crea ${num} domande a risposta aperta ${diffDesc[diff]} sull'argomento "${args?.nome}" della materia "${mat?.nome}".\n\nFormato:\nDOMANDA: [testo domanda]\nRISPOSTA: [risposta attesa dettagliata]\n---\n\nGenera esattamente ${num} domande separate da ---`
  }

  /* ── PREPARE FONTI FOR AI ── */
  async function prepareFontiForAI() {
    const argFonti = fonti.filter(f=>f.argomento_id===currentArgomentoId)
    const imgUrls = []
    const textParts = []

    for (const f of argFonti) {
      const ext = f.nome.split('.').pop()?.toLowerCase()||''
      if (['jpg','jpeg','png','gif','webp'].includes(ext)||f.url.includes('image')) {
        imgUrls.push(f.url)
      } else if (ext==='pdf') {
        // PDF: pass URL, the serverless function will handle it
        imgUrls.push(f.url)
      } else {
        textParts.push(`[File: ${f.nome}]`)
      }
    }
    return { imgUrls, textExtra: textParts.join('\n') }
  }

  /* ── AI TOOLS ── */
  async function runTool(key) {
    const argFonti = fonti.filter(f=>f.argomento_id===currentArgomentoId)
    if (argFonti.length===0 && key!=='chat') { showToast('Carica almeno una fonte prima di usare gli strumenti AI'); return }
    if (key==='quiz'||key==='quiz-aperta') {
      setQuizMode(key==='quiz'?'multipla':'aperta')
      setPendingTool(key); setSheetQuizCfg(true); return
    }
    setFullpageModal({ title:TOOL_LABELS[key]||key, type:'loading', data:null })
    try {
      const { imgUrls } = await prepareFontiForAI()
      const prompt = buildPrompt(key, argFonti)
      const result = await callAI(prompt, imgUrls)
      await saveStorico(key, result)
      if (key==='flashcards') {
        const cards = parseFlashCardBlocks(result)
        setFcCards(cards); setFcIdx(0); setFcFlipped(false)
        setFullpageModal({ title:'Flash Cards', type:'flashcards', data:cards })
      } else if (key==='mappa') {
        const tree = parseMappa(result)
        setMappaData(tree); setExpandedNodes(new Set())
        setFullpageModal({ title:'Mappa Concettuale', type:'mappa', data:tree })
      } else if (key==='riassunto') {
        const sects = parseRiassunto(result)
        setRiassuntoData(sects); setExpandedSects(new Set(sects.map((_,i)=>i)))
        setFullpageModal({ title:'Riassunto', type:'riassunto', data:sects })
      } else {
        setFullpageModal({ title:TOOL_LABELS[key], type:'text', data:result })
      }
    } catch(e) {
      setFullpageModal({ title:'Errore', type:'text', data:`❌ ${e.message}\n\nControlla il pannello Admin e assicurati che un provider AI sia attivo.` })
    }
  }

  async function startQuiz() {
    setSheetQuizCfg(false)
    setFullpageModal({ title:'Generazione quiz…', type:'loading', data:null })
    try {
      const { imgUrls } = await prepareFontiForAI()
      const prompt = buildQuizPrompt(quizNum, quizDiff, quizMode)
      const result = await callAI(prompt, imgUrls)
      await saveStorico(pendingTool, result)
      if (quizMode==='multipla') {
        const parsed = parseQuizBlocks(result)
        if (parsed.length) {
          setQuizData(parsed); setQuizIdx(0); setQuizAnswered(false)
          setFullpageModal({ title:'Quiz', type:'quiz', data:parsed })
        } else {
          setFullpageModal({ title:'Quiz', type:'text', data:result })
        }
      } else {
        // open quiz
        const blocks = result.split('---').map(b=>b.trim()).filter(Boolean)
        const qs = blocks.map(b=>({
          domanda: b.match(/DOMANDA:\s*(.+?)(?:\n|$)/)?.[1]?.trim()||'',
          risposta: b.match(/RISPOSTA:\s*([\s\S]+?)(?:---|$)/)?.[1]?.trim()||'',
        })).filter(q=>q.domanda)
        setQuizData(qs); setOpenAnswers({}); setOpenRevealed({})
        setFullpageModal({ title:'Quiz Aperta', type:'quiz-aperta', data:qs })
      }
    } catch(e) {
      setFullpageModal({ title:'Errore', type:'text', data:`❌ ${e.message}` })
    }
  }

  /* ── CHAT ── */
  async function sendChat() {
    if (!chatInput.trim()||chatLoading) return
    const msg = chatInput.trim(); setChatInput('')
    const newMsgs = [...chatMessages,{ role:'user', content:msg }]
    setChatMessages(newMsgs); setChatLoading(true)
    try {
      const args=argomenti.find(a=>a.id===currentArgomentoId)
      const mat=materie.find(m=>m.id===currentMateriaId)
      const { imgUrls } = await prepareFontiForAI()
      const history = chatMessages.slice(-6).map(m=>`${m.role==='user'?'Tu':'AI'}: ${m.content}`).join('\n')
      const prompt = `Sei un assistente di studio esperto. Stai aiutando uno studente con l'argomento "${args?.nome}" della materia "${mat?.nome}". Analizza le fonti e rispondi in italiano.\n\nStorico:\n${history}\n\nTu: ${msg}`
      const result = await callAI(prompt, imgUrls)
      const updated = [...newMsgs,{ role:'ai', content:result }]
      setChatMessages(updated)
      await saveStorico('chat',`Tu: ${msg}\nAI: ${result}`)
    } catch(e) {
      setChatMessages(prev=>[...prev,{ role:'ai', content:`❌ Errore: ${e.message}` }])
    }
    setChatLoading(false)
  }
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) },[chatMessages])

  /* ── ADMIN ── */
  async function addProvider() {
    if (!newApiKey.trim()) { showToast('Inserisci una chiave API'); return }
    setAdminLoading(true)
    try {
      const res = await fetch('/api/admin/save-key',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ provider:newProvider, nome_display:PROVIDERS_DEF[newProvider].name, modello:newModel, api_key:newApiKey }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Errore')
      showToast('Provider aggiunto ✓'); setNewApiKey(''); await loadProviders()
    } catch(e) { showToast('Errore: '+e.message) }
    setAdminLoading(false)
  }
  async function activateProvider(id) {
    try {
      const res = await fetch('/api/admin/set-active',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) })
      if (!res.ok) throw new Error('Errore'); showToast('Provider attivato ✓'); await loadProviders()
    } catch(e) { showToast('Errore: '+e.message) }
  }
  async function deleteProvider(id) {
    try {
      const res = await fetch('/api/admin/delete-provider',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) })
      if (!res.ok) throw new Error('Errore'); showToast('Provider eliminato'); await loadProviders()
    } catch(e) { showToast('Errore: '+e.message) }
  }

  /* ── RIPASSO ── */
  async function saveRipasso() {
    const { data } = await supabase.from('studio_pianificato').insert({ utente_email:utente.email, materia_id:ripassoMat, argomento_id:ripassoArg, frequenza:ripassoFreq, orario:ripassoOrario, difficolta:2, quiz_num:ripassoQNum, quiz_modalita:ripassoQMode }).select().single()
    if (data) setRipassi(prev=>[data,...prev])
    showToast('Ripasso pianificato ✓')
    // Schedule browser notification if supported
    if ('Notification' in window && Notification.permission==='granted') {
      const [h,m] = ripassoOrario.split(':').map(Number)
      const now = new Date(); const target = new Date()
      target.setHours(h,m,0,0)
      if (target<now) target.setDate(target.getDate()+1)
      const delay = target-now
      setTimeout(()=>{
        new Notification('⚡ FlashBacon — Ripasso!',{ body:`Ora di ripassare: ${materie.find(x=>x.id===ripassoMat)?.nome||''}`, icon:'/favicon.svg' })
      }, delay)
    } else if ('Notification' in window && Notification.permission==='default') {
      Notification.requestPermission()
    }
    navTo('home')
  }
  async function deleteRipasso(id) {
    await supabase.from('studio_pianificato').delete().eq('id',id)
    setRipassi(prev=>prev.filter(r=>r.id!==id))
    showToast('Ripasso eliminato')
  }

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  const currentMateria   = materie.find(m=>m.id===currentMateriaId)
  const currentArgomento = argomenti.find(a=>a.id===currentArgomentoId)
  const activeProvider   = providers.find(p=>p.attivo)
  const argFonti         = fonti.filter(f=>f.argomento_id===currentArgomentoId)

  return (
    <>
      {/* ─── LOADING ─── */}
      {screen==='loading' && (
        <div className="screen" style={{ background:'var(--dark-bg)', alignItems:'center', justifyContent:'center', gap:32 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <LogoSVG size={96}/><BrandName size="2rem"/>
            <div className="loading-bar-track"><div className="loading-bar-fill"/></div>
          </div>
        </div>
      )}

      {/* ─── LOGIN ─── */}
      {screen==='login' && (
        <div className="screen" style={{ background:'var(--red)', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div className="login-card">
            <div className="login-header">
              <LogoSVG size={72}/><BrandName size="1.6rem"/><p>Studia più veloce con l'AI</p>
            </div>
            <div className="tabs">
              <button className={`tab ${loginTab==='accedi'?'active':''}`} onClick={()=>{setLoginTab('accedi');setLoginError('')}}>Accedi</button>
              <button className={`tab ${loginTab==='registrati'?'active':''}`} onClick={()=>{setLoginTab('registrati');setLoginError('')}}>Registrati</button>
            </div>
            {loginTab==='accedi'?(<>
              <div className="field"><label>Email</label><input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
              <div className="field"><label>Password</label><input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
              <button className="btn-primary" onClick={doLogin} disabled={loading}>{loading?'Accesso…':'Accedi'}</button>
            </>):(<>
              <div className="field"><label>Nome</label><input type="text" value={regNome} onChange={e=>setRegNome(e.target.value)} placeholder="Il tuo nome"/></div>
              <div className="field"><label>Email</label><input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="tua@email.com"/></div>
              <div className="field"><label>Password</label><input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Min 6 caratteri"/></div>
              <button className="btn-primary" onClick={doRegister} disabled={loading}>{loading?'Creazione…':'Crea account'}</button>
            </>)}
            {loginError&&<div className="error-msg">{loginError}</div>}
          </div>
        </div>
      )}

      {/* ─── HOME ─── */}
      {screen==='home' && (
        <div className="screen anim">
          <div className="top-bar">
            <div className="logo-small"><LogoSVG size={36}/><BrandName size="1.1rem"/></div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="icon-btn" onClick={()=>{setRipassoStep(1);setRipassoMat(null);setRipassoArg(null);setScreen('ripasso')}} title="Ripasso">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
          </div>
          <div className="home-body">
            <div className="section-title">Le tue materie</div>
            <p style={{ fontSize:'.8rem', color:'var(--muted)', marginTop:-8 }}>Tieni premuto per eliminare</p>
            <div className="materia-grid">
              {materie.map(m=>(
                <div key={m.id} className="materia-card"
                  onClick={()=>{ setCurrentMateriaId(m.id); loadArgomenti(m.id); setScreen('argomenti') }}
                  onMouseDown={()=>startLongPressMateria(m.id)}
                  onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                  onTouchStart={()=>startLongPressMateria(m.id)}
                  onTouchEnd={cancelLongPress}>
                  <SubjectIcon emoji={m.emoji}/>
                  <div className="materia-name">{m.nome}</div>
                  <div className="materia-count">{argomenti.filter(a=>a.materia_id===m.id).length} argomenti</div>
                </div>
              ))}
              <div className="materia-card add-card" onClick={()=>{setNewMatNome('');setNewMatEmoji('📚');setSheetMateria(true)}}>
                <span>+</span><p>Nuova materia</p>
              </div>
            </div>
          </div>
          <div className="bottom-bar" style={{ paddingBottom:'max(18px, env(safe-area-inset-bottom))' }}>
            <button className="bottom-btn active">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></svg>
              Home
            </button>
            <button className="bottom-btn" onClick={()=>setScreen('profilo')}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Profilo
            </button>
          </div>
        </div>
      )}

      {/* ─── ARGOMENTI ─── */}
      {screen==='argomenti' && (
        <div className="screen anim">
          <div className="top-bar">
            <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
            <button className="icon-btn" onClick={()=>{setNewArgNome('');setSheetArgomento(true)}}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          <div className="screen-title-bar">
            <h1>{currentMateria?.emoji} {currentMateria?.nome}</h1>
            <div className="screen-subtitle">Seleziona o crea un argomento</div>
          </div>
          <div className="home-body">
            <div className="argomenti-list">
              {argomenti.filter(a=>a.materia_id===currentMateriaId).length===0&&<div className="empty-state"><span>📝</span><p>Nessun argomento ancora.<br/>Creane uno!</p></div>}
              {argomenti.filter(a=>a.materia_id===currentMateriaId).map(a=>(
                <div key={a.id} className="argomento-card" onClick={()=>{ setCurrentArgomentoId(a.id); setArgTab('fonti'); loadFonti(a.id); loadStorico(a.id); setScreen('argomento') }}>
                  <div className="argomento-name">{a.nome}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button className="argomento-del" onClick={e=>{ e.stopPropagation(); confirmDeleteArgomento(a.id) }}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    </button>
                    <span style={{ color:'var(--muted)' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ARGOMENTO DETAIL ─── */}
      {screen==='argomento' && (
        <div className="screen anim">
          <div className="argomento-top">
            <div className="top-bar" style={{ background:'transparent', padding:'12px 16px 8px' }}>
              <button className="back-btn" onClick={()=>{ loadArgomenti(currentMateriaId); setScreen('argomenti') }}>← Argomenti</button>
              <BrandName size=".95rem"/>
            </div>
            <div style={{ padding:'0 20px 0' }}>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.4rem', color:'white', lineHeight:1.2 }}>{currentArgomento?.nome}</h1>
            </div>
            <div className="argomento-tabs" style={{ marginTop:14 }}>
              {[['fonti','📁 Fonti'],['strumenti','⚡ Strumenti AI'],['chat','💬 Chat'],['storico','📋 Storico']].map(([key,label])=>(
                <button key={key} className={`arg-tab ${argTab===key?'active':''}`} onClick={()=>setArgTab(key)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="arg-body">
            {/* FONTI */}
            {argTab==='fonti' && (<>
              <div className="upload-btn-group">
                <label className="btn-upload">🖼️ Galleria<input type="file" multiple accept="image/*" style={{ display:'none' }} onChange={e=>handleUpload(e.target.files,'image')}/></label>
                <label className="btn-upload">📷 Fotocamera<input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>handleUpload(e.target.files,'image')}/></label>
                <label className="btn-upload">📎 File<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,image/*" style={{ display:'none' }} onChange={e=>handleUpload(e.target.files,'file')}/></label>
              </div>
              <div className="fonti-grid">
                {argFonti.length===0&&<div className="empty-state" style={{ width:'100%' }}><span>📂</span><p>Nessuna fonte caricata</p></div>}
                {argFonti.map(f=>{
                  const ext=f.nome.split('.').pop()?.toLowerCase()||''
                  const isImg=['jpg','jpeg','png','gif','webp'].includes(ext)||f.url?.includes('image')
                  const docIcon={pdf:'📄',doc:'📝',docx:'📝',ppt:'📊',pptx:'📊',xls:'📈',xlsx:'📈',txt:'📃',csv:'📃'}[ext]||'📎'
                  return (
                    <div key={f.id} className="fonte-thumb" style={{ background:isImg?undefined:'#F0F4FF' }}>
                      {isImg?<img src={f.url} alt={f.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<>
                        <span style={{ fontSize:'2rem' }}>{docIcon}</span>
                        <span style={{ fontSize:'.55rem', color:'var(--muted)', padding:'0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%', textAlign:'center' }}>{f.nome}</span>
                      </>}
                      <button className="fonte-del" onClick={()=>deleteFonte(f)}>✕</button>
                      <button className="fonte-rename" onClick={()=>{ setRenameSheet(f); setRenameVal(f.nome) }}>✏️ Rinomina</button>
                    </div>
                  )
                })}
              </div>
            </>)}

            {/* STRUMENTI */}
            {argTab==='strumenti' && (<>
              {activeProvider?.provider==='deepseek'&&argFonti.length>0&&<div className="deepseek-warn">⚠️ DeepSeek non supporta immagini. Le fonti immagine non verranno inviate all'AI.</div>}
              <div className="tools-grid">
                {[
                  {key:'riassunto',icon:'📝',name:'Riassunto',desc:'Sintesi strutturata e espandibile'},
                  {key:'quiz',icon:'❓',name:'Quiz multipla',desc:'Domande a scelta multipla'},
                  {key:'quiz-aperta',icon:'✍️',name:'Quiz aperta',desc:'Risposta libera con confronto'},
                  {key:'flashcards',icon:'🃏',name:'Flash Cards',desc:'Carte FRONTE/RETRO con flip 3D'},
                  {key:'mappa',icon:'🗺️',name:'Mappa concett.',desc:'Mappa interattiva espandibile'},
                  {key:'punti',icon:'🎯',name:'Punti chiave',desc:'Lista 1-5 concetti fondamentali'},
                ].map(t=>(
                  <div key={t.key} className="tool-card" onClick={()=>runTool(t.key)}>
                    <div className="tool-icon">{t.icon}</div>
                    <div className="tool-name">{t.name}</div>
                    <div className="tool-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </>)}

            {/* CHAT */}
            {argTab==='chat' && (<>
              <div className="chat-messages">
                {chatMessages.length===0&&<div className="empty-state"><span>💬</span><p>Chatta con l'AI sulle tue fonti</p></div>}
                {chatMessages.map((m,i)=>(
                  <div key={i} className={`chat-bubble ${m.role}`}>
                    <div className="sender">{m.role==='user'?'Tu':'FlashBacon AI'}</div>
                    {m.content}
                  </div>
                ))}
                {chatLoading&&<div className="chat-bubble ai"><div style={{ display:'flex', gap:6, alignItems:'center' }}><Spinner/><span style={{ fontSize:'.85rem' }}>Sto pensando…</span></div></div>}
                <div ref={chatEndRef}/>
              </div>
              <div className="chat-input-row">
                <input className="chat-input" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Fai una domanda…" onKeyDown={e=>e.key==='Enter'&&sendChat()}/>
                <button className="btn-send" onClick={sendChat} disabled={chatLoading}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
                </button>
              </div>
            </>)}

            {/* STORICO */}
            {argTab==='storico' && (<>
              {selectedStorico.size>0&&(
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--white)', borderRadius:14, padding:'10px 16px', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
                  <span style={{ fontSize:'.85rem', fontWeight:600 }}>{selectedStorico.size} selezionati</span>
                  <button className="btn-sm danger" onClick={deleteSelectedStorico}>Elimina selezionati</button>
                </div>
              )}
              {storico.length===0&&<div className="empty-state"><span>📋</span><p>Nessun output AI ancora</p></div>}
              {storico.map(s=>(
                <div key={s.id} className={`storico-item ${selectedStorico.has(s.id)?'selected':''}`}
                  onMouseDown={()=>{ longPressTimer.current=setTimeout(()=>toggleStoricoSelect(s.id),600) }}
                  onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                  onTouchStart={()=>{ longPressTimer.current=setTimeout(()=>toggleStoricoSelect(s.id),600) }}
                  onTouchEnd={cancelLongPress}>
                  <div className="storico-header">
                    <div className="storico-tipo">{s.tipo}</div>
                    <div className="storico-data">{formatData(s.created_at)}</div>
                  </div>
                  <div className="storico-preview">{s.contenuto.substring(0,120)}{s.contenuto.length>120?'…':''}</div>
                  <div className="storico-actions">
                    <button className="storico-btn" onClick={()=>openFromStorico(s)}>Apri</button>
                    <button className="storico-del" onClick={()=>deleteStorico(s.id)}>Elimina</button>
                  </div>
                </div>
              ))}
              {storico.length>0&&<p style={{ fontSize:'.75rem', color:'var(--muted)', textAlign:'center' }}>Tieni premuto per selezionare più elementi</p>}
            </>)}
          </div>
        </div>
      )}

      {/* ─── PROFILO ─── */}
      {screen==='profilo' && (
        <div className="screen anim" style={{ background:'var(--gray)' }}>
          <div className="profilo-top">
            <div className="top-bar" style={{ background:'transparent', padding:'12px 16px 0' }}>
              <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
            </div>
            <div className="avatar">{utente?.nome?.[0]?.toUpperCase()||'👤'}</div>
            <div className="profilo-name">{utente?.nome}</div>
            <div className="profilo-email">{utente?.email}</div>
          </div>
          <div className="profilo-body" style={{ paddingTop:32 }}>
            <div className="profile-stat"><span className="profile-stat-label">Materie create</span><span className="profile-stat-val">{materie.length}</span></div>
            <div className="profile-stat"><span className="profile-stat-label">Output AI generati</span><span className="profile-stat-val">{storico.length}</span></div>
            <button className="btn-secondary" style={{ marginTop:0 }} onClick={()=>{ setOnboarding(true); setOnboardingStep(0) }}>📖 Rivedi la guida</button>
            {utente?.is_admin&&<button className="btn-admin" onClick={()=>{ loadProviders(); setScreen('admin') }}>⚙️ Pannello Admin</button>}
            <button className="btn-logout" onClick={doLogout}>Esci dall'account</button>
            <button className="btn-danger-outline" onClick={confirmDeleteAccount}>🗑️ Elimina account</button>
          </div>
        </div>
      )}

      {/* ─── ADMIN ─── */}
      {screen==='admin' && (
        <div className="screen anim" style={{ background:'var(--gray)' }}>
          <div className="admin-top">
            <div className="top-bar" style={{ background:'transparent', padding:'12px 16px 0' }}>
              <button className="back-btn" onClick={()=>setScreen('profilo')}>← Profilo</button>
            </div>
            <h1>Pannello Admin</h1><p>Gestisci i provider AI</p>
          </div>
          <div className="admin-body">
            {activeProvider&&<div className="banner-active">⚡ Provider attivo: <strong>{activeProvider.nome_display}</strong> — {activeProvider.modello}</div>}
            {providers.length===0&&<div className="empty-state"><span>🔑</span><p>Nessun provider configurato.</p></div>}
            {providers.map(p=>(
              <div key={p.id} className={`provider-card ${p.attivo?'active-provider':''}`}>
                <div className="provider-header">
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
              <select className="select-field" value={newProvider} onChange={e=>{ setNewProvider(e.target.value); setNewModel(PROVIDERS_DEF[e.target.value].models[0]) }}>
                {Object.entries(PROVIDERS_DEF).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </select>
              <select className="select-field" value={newModel} onChange={e=>setNewModel(e.target.value)}>
                {PROVIDERS_DEF[newProvider].models.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <div className="field" style={{ marginBottom:12 }}><label>API Key</label><input type="password" value={newApiKey} onChange={e=>setNewApiKey(e.target.value)} placeholder="Inserisci chiave API…"/></div>
              <button className="btn-primary" onClick={addProvider} disabled={adminLoading}>{adminLoading?'Salvataggio…':'Salva provider'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RIPASSO ─── */}
      {screen==='ripasso' && (
        <div className="screen anim" style={{ background:'var(--gray)' }}>
          <div className="top-bar" style={{ background:'var(--dark-bg)' }}>
            <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
            <BrandName size="1rem"/>
          </div>
          <div className="ripasso-body">
            <div className="section-title">📅 Ripasso Pianificato</div>

            {/* Lista ripassi salvati */}
            {ripassi.length>0&&(
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <p style={{ fontSize:'.82rem', fontWeight:600, color:'var(--muted)' }}>PIANIFICATI</p>
                {ripassi.map(r=>{
                  const mat=materie.find(m=>m.id===r.materia_id)
                  const arg=argomenti.find(a=>a.id===r.argomento_id)
                  return (
                    <div key={r.id} className="ripasso-item">
                      <div className="ripasso-item-info">
                        <div className="ripasso-item-name">{mat?.emoji} {mat?.nome}</div>
                        <div className="ripasso-item-meta">{arg?arg.nome:'Tutti gli argomenti'} · {r.frequenza} · {r.orario} · {r.quiz_num} domande {r.quiz_modalita}</div>
                      </div>
                      <button className="btn-sm danger" onClick={()=>deleteRipasso(r.id)}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            <p style={{ fontSize:'.82rem', fontWeight:600, color:'var(--muted)' }}>NUOVO RIPASSO</p>
            {ripassoStep===1&&(<>
              <div className="ripasso-card"><h4>1. Scegli la materia</h4>
                {materie.map(m=><button key={m.id} className={`ripasso-option ${ripassoMat===m.id?'sel':''}`} onClick={()=>setRipassoMat(m.id)}>{m.emoji} {m.nome}</button>)}
              </div>
              <button className="btn-primary" onClick={()=>setRipassoStep(2)} disabled={!ripassoMat}>Avanti →</button>
            </>)}
            {ripassoStep===2&&(<>
              <div className="ripasso-card"><h4>2. Scegli l'argomento</h4>
                <button className={`ripasso-option ${!ripassoArg?'sel':''}`} onClick={()=>setRipassoArg(null)}>📚 Tutti gli argomenti</button>
                {argomenti.filter(a=>a.materia_id===ripassoMat).map(a=><button key={a.id} className={`ripasso-option ${ripassoArg===a.id?'sel':''}`} onClick={()=>setRipassoArg(a.id)}>{a.nome}</button>)}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-secondary" style={{ marginTop:0 }} onClick={()=>setRipassoStep(1)}>← Indietro</button>
                <button className="btn-primary" onClick={()=>setRipassoStep(3)}>Avanti →</button>
              </div>
            </>)}
            {ripassoStep===3&&(<>
              <div className="ripasso-card"><h4>3. Configura le opzioni</h4>
                <div className="field" style={{ marginBottom:12 }}><label>Frequenza</label>
                  <select className="select-field" value={ripassoFreq} onChange={e=>setRipassoFreq(e.target.value)}>
                    <option value="giornaliero">Giornaliero</option><option value="settimanale">Settimanale</option><option value="mensile">Mensile</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom:12 }}><label>Orario</label>
                  <input type="time" className="select-field" value={ripassoOrario} onChange={e=>setRipassoOrario(e.target.value)}/>
                </div>
                <div className="field" style={{ marginBottom:12 }}><label>Numero domande</label>
                  <select className="select-field" value={ripassoQNum} onChange={e=>setRipassoQNum(Number(e.target.value))}>
                    <option value={5}>5 domande</option><option value={10}>10 domande</option><option value={20}>20 domande</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom:0 }}><label>Modalità quiz</label>
                  <select className="select-field" value={ripassoQMode} onChange={e=>setRipassoQMode(e.target.value)}>
                    <option value="multipla">Risposta multipla</option><option value="aperta">Risposta aperta</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-secondary" style={{ marginTop:0 }} onClick={()=>setRipassoStep(2)}>← Indietro</button>
                <button className="btn-primary" onClick={saveRipasso}>💾 Salva ripasso</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ══════════ FULLPAGE MODAL ══════════ */}
      {fullpageModal && (
        <div className="fullpage-modal">
          <div className="fullpage-header">
            <button className="back-btn" style={{ background:'var(--gray)', color:'var(--ink)' }} onClick={()=>setFullpageModal(null)}>← Indietro</button>
            <div className="fullpage-title">{fullpageModal.title}</div>
          </div>
          <div className="fullpage-body">
            {/* LOADING */}
            {fullpageModal.type==='loading'&&<div className="ai-loading"><Spinner/><p>L'AI sta elaborando le tue fonti…</p></div>}

            {/* TEXT / PUNTI */}
            {fullpageModal.type==='text'&&<div className="md-output" dangerouslySetInnerHTML={{ __html:renderMD(fullpageModal.data||'') }}/>}

            {/* RIASSUNTO INTERATTIVO */}
            {fullpageModal.type==='riassunto'&&riassuntoData&&(
              <div className="riassunto-container">
                {riassuntoData.map((sec,i)=>(
                  <div key={i} className="riassunto-section">
                    <div className="riassunto-section-header" onClick={()=>{ const n=new Set(expandedSects); n.has(i)?n.delete(i):n.add(i); setExpandedSects(n) }}>
                      {sec.title}
                      <span>{expandedSects.has(i)?'▲':'▼'}</span>
                    </div>
                    {expandedSects.has(i)&&(
                      <div className="riassunto-section-body">
                        {sec.content.map((c,j)=>
                          c.type==='h3'?<h3 key={j} style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'.9rem', margin:'10px 0 6px' }}>{c.text}</h3>:
                          c.type==='li'?<ul key={j}><li>{c.text}</li></ul>:
                          <p key={j}>{c.text}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* QUIZ MULTIPLA */}
            {fullpageModal.type==='quiz'&&quizData&&(
              quizIdx>=quizData.length?(
                <div style={{ textAlign:'center', padding:'48px 20px' }}>
                  <div style={{ fontSize:'4rem', marginBottom:16 }}>🎉</div>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.5rem', marginBottom:10 }}>Quiz completato!</h2>
                  <p style={{ color:'var(--muted)', marginBottom:24 }}>Ottimo lavoro! Continua così.</p>
                  <button className="btn-primary" style={{ maxWidth:240, margin:'0 auto' }} onClick={()=>{ setQuizIdx(0); setQuizAnswered(false) }}>Riprova dall'inizio</button>
                </div>
              ):(
                <>
                  <div className="quiz-progress">
                    {quizData.map((_,i)=><div key={i} className={`quiz-dot ${i<quizIdx?'done':i===quizIdx?'current':''}`}/>)}
                  </div>
                  <QuizQuestion q={quizData[quizIdx]} idx={quizIdx} total={quizData.length} answered={quizAnswered} setAnswered={setQuizAnswered} onNext={()=>{ setQuizIdx(i=>i+1); setQuizAnswered(false) }}/>
                </>
              )
            )}

            {/* QUIZ APERTA */}
            {fullpageModal.type==='quiz-aperta'&&quizData&&(
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {quizData.map((q,i)=>(
                  <div key={i} className="quiz-question-card">
                    <div className="quiz-q-text">{i+1}. {q.domanda}</div>
                    <textarea className="quiz-open-input" placeholder="Scrivi la tua risposta…" value={openAnswers[i]||''} onChange={e=>setOpenAnswers(prev=>({...prev,[i]:e.target.value}))}/>
                    {!openRevealed[i]?(
                      <button className="btn-sm primary" style={{ marginTop:10 }} onClick={()=>setOpenRevealed(prev=>({...prev,[i]:true}))}>Mostra risposta attesa</button>
                    ):(
                      <div className="quiz-reveal"><strong>Risposta attesa:</strong><br/>{q.risposta}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* FLASHCARDS */}
            {fullpageModal.type==='flashcards'&&fcCards.length>0&&(
              <>
                <div className="fc-progress">
                  {fcCards.map((_,i)=><div key={i} className={`fc-dot ${i<=fcIdx?'seen':''}`}/>)}
                </div>
                <div className="fc-container" onClick={()=>setFcFlipped(f=>!f)}>
                  <div className="fc-card" style={{ transform:fcFlipped?'rotateY(180deg)':'none', minHeight:220, position:'relative' }}>
                    <div className="card-face card-front">
                      <div className="card-label">FRONTE</div>
                      <div className="card-text">{fcCards[fcIdx]?.front}</div>
                    </div>
                    <div className="card-face card-back">
                      <div className="card-label">RETRO</div>
                      <div className="card-text">{fcCards[fcIdx]?.back}</div>
                    </div>
                  </div>
                </div>
                <div className="fc-tip">Tocca la carta per girarla</div>
                <div className="fc-nav">
                  <button onClick={()=>{ setFcIdx(i=>Math.max(0,i-1)); setFcFlipped(false) }} disabled={fcIdx===0}>← Prec.</button>
                  <span className="fc-counter">{fcIdx+1} / {fcCards.length}</span>
                  <button onClick={()=>{ setFcIdx(i=>Math.min(fcCards.length-1,i+1)); setFcFlipped(false) }} disabled={fcIdx===fcCards.length-1}>Succ. →</button>
                </div>
              </>
            )}

            {/* MAPPA INTERATTIVA */}
            {fullpageModal.type==='mappa'&&mappaData&&(
              <div className="mappa-container">
                <div className="mappa-node-main">{mappaData.title||'Mappa Concettuale'}</div>
                <div className="mappa-branches">
                  {mappaData.branches.map((b,i)=>(
                    <div key={i} className="mappa-node" onClick={()=>{ const n=new Set(expandedNodes); n.has(i)?n.delete(i):n.add(i); setExpandedNodes(n) }}>
                      <div className="mappa-node-title">
                        <span>{b.title}</span>
                        <span style={{ color:'var(--orange)', fontSize:'.85rem' }}>{expandedNodes.has(i)?'▲':'▼'}</span>
                      </div>
                      {expandedNodes.has(i)&&b.children.length>0&&(
                        <div className="mappa-node-children">
                          {b.children.map((c,j)=><div key={j} className="mappa-child">• {c}</div>)}
                        </div>
                      )}
                    </div>
                  ))}
                  {mappaData.branches.length===0&&<p style={{ color:'var(--muted)', fontSize:'.85rem', padding:'12px 0' }}>Clicca i nodi per espanderli</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ CUSTOM DIALOG ══════════ */}
      {dialog&&(
        <div className="dialog-overlay" onClick={()=>setDialog(null)}>
          <div className="dialog-box" onClick={e=>e.stopPropagation()}>
            <div className="dialog-icon">{dialog.icon}</div>
            <div className="dialog-title">{dialog.title}</div>
            <div className="dialog-msg">{dialog.msg}</div>
            <div className="dialog-actions">
              <button className="btn-primary" style={{ background:dialog.confirmDanger?'var(--red)':'var(--dark-bg)' }} onClick={()=>{ dialog.onConfirm(); setDialog(null) }}>{dialog.confirmLabel||'Conferma'}</button>
              <button className="btn-secondary" style={{ marginTop:0 }} onClick={()=>setDialog(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SHEET: NUOVA MATERIA ══════════ */}
      {sheetMateria&&(
        <div className="sheet-overlay" onClick={()=>setSheetMateria(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <h3>Nuova Materia</h3>
            <div className="emoji-grid">{EMOJIS.map(e=><div key={e} className={`emoji-opt ${newMatEmoji===e?'selected':''}`} onClick={()=>setNewMatEmoji(e)}>{e}</div>)}</div>
            <div className="field"><label>Nome materia</label><input type="text" value={newMatNome} onChange={e=>setNewMatNome(e.target.value)} placeholder="Es. Matematica" onKeyDown={e=>e.key==='Enter'&&saveMateria()}/></div>
            <button className="btn-primary" onClick={saveMateria}>Crea materia</button>
          </div>
        </div>
      )}

      {/* ══════════ SHEET: NUOVO ARGOMENTO ══════════ */}
      {sheetArgomento&&(
        <div className="sheet-overlay" onClick={()=>setSheetArgomento(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <h3>Nuovo Argomento</h3>
            <div className="field"><label>Nome argomento</label><input type="text" value={newArgNome} onChange={e=>setNewArgNome(e.target.value)} placeholder="Es. Equazioni di 2° grado" onKeyDown={e=>e.key==='Enter'&&saveArgomento()}/></div>
            <button className="btn-primary" onClick={saveArgomento}>Crea argomento</button>
          </div>
        </div>
      )}

      {/* ══════════ SHEET: CONFIGURA QUIZ ══════════ */}
      {sheetQuizCfg&&(
        <div className="sheet-overlay" onClick={()=>setSheetQuizCfg(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <h3>Configura Quiz</h3>
            <div className="field"><label>Numero domande</label>
              <select className="select-field" value={quizNum} onChange={e=>setQuizNum(Number(e.target.value))}>
                <option value={5}>5 domande</option><option value={10}>10 domande</option><option value={20}>20 domande</option>
              </select>
            </div>
            <div className="field"><label>Difficoltà</label>
              <select className="select-field" value={quizDiff} onChange={e=>setQuizDiff(e.target.value)}>
                <option value="facile">Facile</option><option value="medio">Medio</option><option value="difficile">Difficile</option>
              </select>
            </div>
            <button className="btn-primary" onClick={startQuiz}>Genera Quiz →</button>
          </div>
        </div>
      )}

      {/* ══════════ SHEET: RINOMINA FONTE ══════════ */}
      {renameSheet&&(
        <div className="sheet-overlay" onClick={()=>setRenameSheet(null)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <h3>Rinomina fonte</h3>
            <div className="field"><label>Nuovo nome</label><input type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renameFonte(renameSheet,renameVal)}/></div>
            <button className="btn-primary" onClick={()=>renameFonte(renameSheet,renameVal)}>Salva</button>
          </div>
        </div>
      )}

      {/* ══════════ NOTIFICA RIPASSO ══════════ */}
      {notifica&&(
        <div className="notifica-banner" onClick={()=>{ setCurrentMateriaId(notifica.materiaId); if(notifica.argomentoId) setCurrentArgomentoId(notifica.argomentoId); setScreen('argomento'); setNotifica(null) }}>
          <span>{notifica.msg}</span>
          <span>→</span>
        </div>
      )}

      {/* ══════════ ONBOARDING ══════════ */}
      {onboarding&&(
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            <div className="onboarding-icon">{ONBOARDING_STEPS[onboardingStep].icon}</div>
            <div className="onboarding-title">{ONBOARDING_STEPS[onboardingStep].title}</div>
            <div className="onboarding-desc">{ONBOARDING_STEPS[onboardingStep].desc}</div>
            <div className="onboarding-dots">
              {ONBOARDING_STEPS.map((_,i)=><div key={i} className={`onboarding-dot ${i===onboardingStep?'active':''}`}/>)}
            </div>
            <div style={{ display:'flex', gap:8, flexDirection:'column' }}>
              <button className="btn-primary" onClick={()=>{
                if (onboardingStep<ONBOARDING_STEPS.length-1) { setOnboardingStep(s=>s+1) }
                else { setOnboarding(false); localStorage.setItem('fb_onboarded_'+utente?.id,'1') }
              }}>
                {onboardingStep<ONBOARDING_STEPS.length-1?'Avanti →':'Inizia a studiare ⚡'}
              </button>
              <button style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'.85rem', padding:'8px' }} onClick={()=>{ setOnboarding(false); localStorage.setItem('fb_onboarded_'+utente?.id,'1') }}>
                Salta la guida
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  /* ── OPEN FROM STORICO ── */
  function openFromStorico(s) {
    if (s.tipo==='flashcards') {
      const cards = parseFlashCardBlocks(s.contenuto)
      if (cards.length) { setFcCards(cards); setFcIdx(0); setFcFlipped(false); setFullpageModal({ title:'Flash Cards', type:'flashcards', data:cards }); return }
    }
    if (s.tipo==='mappa') {
      const tree = parseMappa(s.contenuto)
      setMappaData(tree); setExpandedNodes(new Set())
      setFullpageModal({ title:'Mappa Concettuale', type:'mappa', data:tree }); return
    }
    if (s.tipo==='riassunto') {
      const sects = parseRiassunto(s.contenuto)
      setRiassuntoData(sects); setExpandedSects(new Set(sects.map((_,i)=>i)))
      setFullpageModal({ title:'Riassunto', type:'riassunto', data:sects }); return
    }
    if (s.tipo==='quiz') {
      const parsed = parseQuizBlocks(s.contenuto)
      if (parsed.length) { setQuizData(parsed); setQuizIdx(0); setQuizAnswered(false); setFullpageModal({ title:'Quiz', type:'quiz', data:parsed }); return }
    }
    setFullpageModal({ title:s.tipo, type:'text', data:s.contenuto })
  }
}

function renderMD(md) {
  return md
    .replace(/^## (.+)$/gm,'<h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:1.15rem;margin:0 0 12px;line-height:1.2">$1</h2>')
    .replace(/^### (.+)$/gm,'<h3 style="font-family:Syne,sans-serif;font-weight:700;font-size:1rem;margin:14px 0 8px;line-height:1.2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^- (.+)$/gm,'<li style="margin:4px 0 4px 18px">$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li style="margin:4px 0 4px 18px;list-style-type:decimal">$1</li>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid #E4E4E4;margin:14px 0">')
    .replace(/\n\n/g,'<br>')
}

/* ══════════════════════════════════════════
   QUIZ QUESTION COMPONENT
══════════════════════════════════════════ */
function QuizQuestion({ q, idx, total, answered, setAnswered, onNext }) {
  const [chosen, setChosen] = useState(null)
  function answer(i) {
    if (answered) return
    setChosen(i); setAnswered(true)
  }
  return (
    <div className="quiz-question-card">
      <p style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:600, marginBottom:10 }}>Domanda {idx+1} di {total}</p>
      <div className="quiz-q-text">{q.domanda}</div>
      {q.opzioni.map((o,i)=>(
        <button key={i} className={`quiz-option ${answered?(i===q.corretta?'correct':i===chosen?'wrong':''):''}`} onClick={()=>answer(i)} disabled={answered}>
          <span className="quiz-letter">{['A','B','C','D'][i]}</span>
          {o}
        </button>
      ))}
      {answered&&<div className="quiz-spieg">💡 {q.spiegazione}</div>}
      {answered&&<button className="btn-primary" style={{ marginTop:14 }} onClick={onNext}>{idx+1<total?'Prossima →':'Vedi risultato'}</button>}
    </div>
  )
}
