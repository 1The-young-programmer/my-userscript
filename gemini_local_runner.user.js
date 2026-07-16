// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  מוסיף כפתור לג'מיני לשליחה והרצה אוטומטית של קוד במחשב המקומי (תומך בכל השפות)
// @match        https://gemini.google.com/*
// @updateURL    https://github.com/1The-young-programmer/my-userscript/raw/main/gemini_local_runner.user.js
// @downloadURL  https://github.com/1The-young-programmer/my-userscript/raw/main/gemini_local_runner.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // פונקציה לשליחת הקוד לשרת המקומי 
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

    // פונקציית עזר ליצירת העיצוב של הכפתור
    function createRunButton() {
        const btn = document.createElement('button');
        btn.className = 'local-run-btn';
        btn.innerHTML = '🚀 הפעל מקומית';
        btn.style.cssText = 'background-color: #1a73e8; color: white; border: none; padding: 6px 16px; border-radius: 18px; cursor: pointer; margin: 0 10px; font-family: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); transition: background 0.2s; z-index: 100;';
        btn.onmouseover = () => btn.style.backgroundColor = '#1557b0';
        btn.onmouseout = () => btn.style.backgroundColor = '#1a73e8';
        return btn;
    }

    // הפעולה שתקרה בעת לחיצה על הכפתור
    async function handleRunClick(e, btn, isCanvas) {
        e.preventDefault(); e.stopPropagation();
        
        let code = "";
        
        if (isCanvas) {
            // שאיבת קוד מתוך הקנבס
            const canvasEditor = document.querySelector('.immersive-editor, .ProseMirror, .cm-content');
            if (canvasEditor) code = canvasEditor.innerText || canvasEditor.textContent;
        } else {
            // שאיבת קוד מבלוק רגיל בצ'אט
            const codeBlock = btn.closest('.code-block-header').parentElement.querySelector('code, pre');
            if (codeBlock) code = codeBlock.innerText;
        }

        // גיבוי אחרון אם הקוד הקודם נכשל
        if (!code || code.trim().length === 0) {
            const anyEditor = document.querySelector('.cm-content, .ProseMirror');
            if (anyEditor) code = anyEditor.innerText;
        }

        if (code && code.trim().length > 0) {
            btn.innerHTML = 'מריץ... ⏳';
            btn.style.backgroundColor = '#f59e0b';
            
            const success = await sendCodeToLocalRunner(code);
            if(success) {
                btn.innerHTML = '✅ בוצע!';
                btn.style.backgroundColor = '#10b981';
            } else {
                btn.innerHTML = '❌ שגיאה בשרת';
                btn.style.backgroundColor = '#ef4444';
            }
            
            setTimeout(() => {
                btn.innerHTML = '🚀 הפעל מקומית';
                btn.style.backgroundColor = '#1a73e8';
            }, 3500);
        } else {
            alert("לא נמצא קוד להרצה על המסך.");
        }
    }

    function injectButton() {
        // --- 1. הזרקה לבלוקי קוד רגילים בצ'אט ---
        const chatToolbars = document.querySelectorAll('.code-block-header');
        chatToolbars.forEach(toolbar => {
            if (!toolbar.querySelector('.local-run-btn')) {
                const btn = createRunButton();
                btn.onclick = (e) => handleRunClick(e, btn, false);
                toolbar.prepend(btn);
            }
        });

        // --- 2. הזרקה לחלון הקנבס המיוחד ---
        let colabBtn = null;
        const allButtons = document.querySelectorAll('button, span[role="button"], div[role="button"]');
        
        // חיפוש מדויק של כפתור ה-Colab כנקודת עוגן
        for (let b of allButtons) {
            const text = (b.textContent || "").toLowerCase();
            const aria = (b.getAttribute('aria-label') || "").toLowerCase();
            
            if ((text.includes('colab') || aria.includes('colab') || text.includes('קולאב')) && text.length < 40) {
                colabBtn = b;
                break;
            }
        }

        // אם מצאנו את כפתור הקולאב, נשתול את שלנו ממש לידו
        if (colabBtn) {
            const canvasToolbar = colabBtn.parentElement;
            if (canvasToolbar && !canvasToolbar.querySelector('.local-run-btn')) {
                const btn = createRunButton();
                btn.onclick = (e) => handleRunClick(e, btn, true);
                
                // הזרקה לפני כפתור הקולאב באותו שטח בדיוק
                canvasToolbar.insertBefore(btn, colabBtn);
            }
        }
    }

    // ריצה רציפה ברקע לאיתור השינויים בדף
    setInterval(injectButton, 1000);
})();
