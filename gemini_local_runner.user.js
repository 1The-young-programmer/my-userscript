// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  מוסיף כפתור לג'מיני לשליחה והרצה אוטומטית של קוד במחשב המקומי
// @match        https://gemini.google.com/*
// @updateURL    https://github.com/1The-young-programmer/my-userscript/raw/main/gemini_local_runner.user.js
// @downloadURL  https://github.com/1The-young-programmer/my-userscript/raw/main/gemini_local_runner.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    async function sendCodeToLocalRunner(codeText) {
        try {
            const response = await fetch('http://127.0.0.1:8080/update', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: codeText
            });
            return response.ok;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }
    function addButton() {
        // כולל את התמיכה בממשקים בעברית
        const toolbars = document.querySelectorAll('.code-block-header, header:has(button[aria-label*="Colab"]), header:has(button[aria-label*="קולאב"]), header:has(button[tooltip*="Colab"]), .action-buttons, toolbar.extended-response-toolbar');

        toolbars.forEach(toolbar => {
            if (!toolbar.querySelector('.local-run-btn')) {
                const btn = document.createElement('button');
                btn.className = 'local-run-btn';
                btn.innerHTML = '🚀 הפעל מקומית';
                btn.style.cssText = 'background-color: #1a73e8; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin: 0 10px; font-family: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);';
                btn.onclick = async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    
                    let code = "";
                    const canvasEditor = document.querySelector('.immersive-editor, .ProseMirror, .cm-content');
                    if (canvasEditor && toolbar.closest('header, .toolbar, canvas-ui')) {
                        code = canvasEditor.innerText || canvasEditor.textContent;
                    } else {
                        const codeBlock = toolbar.parentElement.querySelector('code');
                        if (codeBlock) code = codeBlock.innerText;
                    }

                    if (code && code.trim().length > 0) {
                        btn.innerHTML = 'מריץ... ⏳';
                        btn.style.backgroundColor = '#f59e0b';
                        
                        const success = await sendCodeToLocalRunner(code);
                        if(success) {
                            btn.innerHTML = '✅ בוצע! (רץ ברקע)';
                            btn.style.backgroundColor = '#10b981';
                        } else {
                            btn.innerHTML = '❌ שגיאה (השרת דולק?)';
                            btn.style.backgroundColor = '#ef4444';
                        }
                        setTimeout(() => {
                            btn.innerHTML = '🚀 הפעל מקומית';
                            btn.style.backgroundColor = '#1a73e8';
                        }, 3500);
                    } else {
                        alert("לא נמצא קוד להרצה.");
                    }
                };
                toolbar.prepend(btn); 
            }
        });
    }
    setInterval(addButton, 1000);
})();
