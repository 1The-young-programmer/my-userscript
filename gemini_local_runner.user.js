// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  מוסיף כפתור לג'מיני לשליחה והרצה אוטומטית של קוד במחשב המקומי (תומך בכל השפות)
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

    function createRunButton() {
        const btn = document.createElement('button');
        btn.className = 'local-run-btn';
        btn.innerHTML = '🚀 הפעל מקומית';
        btn.style.cssText = 'background-color: #1a73e8; color: white; border: none; padding: 6px 16px; border-radius: 18px; cursor: pointer; margin: 0 10px; font-family: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); transition: background 0.2s; z-index: 100;';
        btn.onmouseover = () => btn.style.backgroundColor = '#1557b0';
        btn.onmouseout = () => btn.style.backgroundColor = '#1a73e8';
        return btn;
    }

    async function handleRunClick(e, btn) {
        e.preventDefault(); e.stopPropagation();
        
        let code = "";
        
        // ננסה לשאוב קוד קודם כל מהקנבס אם קיים
        const cmContent = document.querySelector('.cm-content');
        if (cmContent) {
            code = cmContent.innerText || cmContent.textContent;
        } else {
            // אם לא בקנבס, נחפש בלוק קוד רגיל שהכפתור שייך אליו
            const codeBlock = btn.closest('.code-block-header, .toolbar, header')?.parentElement?.querySelector('code, pre');
            if (codeBlock) code = codeBlock.innerText;
        }

        // גיבוי אחרון לשאיבת קוד
        if (!code || code.trim().length === 0) {
            const anyEditor = document.querySelector('.immersive-editor, .ProseMirror');
            if (anyEditor) code = anyEditor.innerText || anyEditor.textContent;
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

    function findColabButton() {
        // סריקה מתקדמת מבוססת טקסט
        const allButtons = document.querySelectorAll('button, a, div[role="button"], span');
        for (let b of allButtons) {
            if (b.innerText && (b.innerText.includes('Colab') || b.innerText.includes('קולאב'))) {
                // טיפוס למעלה כדי למצוא את כפתור האב האמיתי אם מצאנו רק תגית פנימית
                let parent = b;
                while(parent && parent.tagName !== 'BUTTON' && parent.tagName !== 'A' && parent.getAttribute('role') !== 'button') {
                    if (parent.parentElement) parent = parent.parentElement;
                    else break;
                }
                return parent || b;
            }
        }
        return null;
    }

    function injectButton() {
        let isCanvasButtonInjected = false;

        // --- 1. הזרקה לבלוקי קוד רגילים בצ'אט ---
        const chatToolbars = document.querySelectorAll('.code-block-header');
        chatToolbars.forEach(toolbar => {
            if (!toolbar.querySelector('.local-run-btn')) {
                const btn = createRunButton();
                btn.onclick = (e) => handleRunClick(e, btn);
                toolbar.prepend(btn);
            }
        });

        // --- 2. הזרקה לקנבס (Artifacts) מבוססת חיפוש קולאב ---
        const colabBtn = findColabButton();
        if (colabBtn) {
            const targetToolbar = colabBtn.parentElement;
            if (targetToolbar && !targetToolbar.querySelector('.local-run-btn')) {
                const btn = createRunButton();
                btn.onclick = (e) => handleRunClick(e, btn);
                targetToolbar.insertBefore(btn, colabBtn);
                isCanvasButtonInjected = true;
                
                // הסרת כפתור צף אם היה קיים
                const floatingBtn = document.getElementById('floating-local-run');
                if(floatingBtn) floatingBtn.remove();
            } else if (targetToolbar && targetToolbar.querySelector('.local-run-btn')) {
                isCanvasButtonInjected = true;
            }
        }

        // --- 3. גיבוי חירום (כפתור צף) ---
        // אם לא מצאנו את הקולאב אבל מזהים שעורך קוד גדול פתוח כרגע במסך
        const isCodeEditorOpen = document.querySelector('.cm-content, .immersive-editor');
        if (!isCanvasButtonInjected && isCodeEditorOpen) {
            if (!document.getElementById('floating-local-run')) {
                const btn = createRunButton();
                btn.id = 'floating-local-run';
                btn.innerHTML = '🚀 הפעל מקומית (צף)';
                btn.style.position = 'fixed';
                btn.style.top = '90px';
                btn.style.left = '40px';
                btn.style.zIndex = '999999';
                btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                btn.style.border = '2px solid white';
                btn.onclick = (e) => handleRunClick(e, btn);
                document.body.appendChild(btn);
            }
        } else if (isCanvasButtonInjected || !isCodeEditorOpen) {
            // ניקוי הכפתור הצף כשאין בו צורך
            const floatingBtn = document.getElementById('floating-local-run');
            if (floatingBtn) floatingBtn.remove();
        }
    }

    // סריקה מהירה כל חצי שנייה כדי להבטיח תגובה מיידית לפתיחת הקנבס
    setInterval(injectButton, 500);
})();
