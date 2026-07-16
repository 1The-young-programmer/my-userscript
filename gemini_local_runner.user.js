// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      3.4
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

        // --- 2. הזרקה ממוקדת לחלון הקנבס המיוחד (Artifacts) ---
        // חיפוש עורך הקוד הייחודי של הקנבס
        const canvasEditor = document.querySelector('.immersive-editor, .ProseMirror, .cm-content');
        if (canvasEditor) {
            // איתור כפתור ה-Colab על בסיס מבנה ה-DOM החדש שנראה בתמונה (כפתור Angular Material)
            let colabBtn = null;
            // הגישה היעילה ביותר היא חיפוש אלמנט עם מחלקת material ספציפית והטקסט הרלוונטי
            const buttons = document.querySelectorAll('button.mdc-unelevated-button, button.mat-mdc-unelevated-button, a[role="button"]');
            for (let el of buttons) {
                 if (el.textContent && (el.textContent.includes('Colab') || el.textContent.includes('קולאב'))) {
                     colabBtn = el;
                     break;
                 }
            }
            
            if (colabBtn) {
                // מציאת הסרגל (ההורה של הכפתור)
                const targetToolbar = colabBtn.parentElement;
                if (targetToolbar && !targetToolbar.querySelector('.local-run-btn')) {
                    const btn = createRunButton();
                    btn.onclick = (e) => handleRunClick(e, btn, true);
                    // הזרקה לפני כפתור הקולאב
                    targetToolbar.insertBefore(btn, colabBtn);
                    
                    // ניקוי כפתור צף אם היה קיים כגיבוי קודם
                    const floatingBtn = document.getElementById('floating-local-run');
                    if(floatingBtn) floatingBtn.remove();
                }
            } else {
                 // Fallback: יצירת כפתור צף אם כפתור Colab לא אותר במבנה החדש
                 if (!document.getElementById('floating-local-run')) {
                    const btn = createRunButton();
                    btn.id = 'floating-local-run';
                    btn.innerHTML = '🚀 הפעל מקומית (צף)';
                    btn.style.position = 'fixed';
                    btn.style.top = '90px'; // מיקום בחלק העליון
                    btn.style.left = '40px'; // בצד שמאל
                    btn.style.zIndex = '999999';
                    btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                    btn.style.border = '2px solid white';
                    btn.onclick = (e) => handleRunClick(e, btn, true);
                    document.body.appendChild(btn);
                }
            }
        } else {
            // ניקוי הכפתור הצף אם חלון הקנבס נסגר לחלוטין
            const floatingBtn = document.getElementById('floating-local-run');
            if (floatingBtn) floatingBtn.remove();
        }
    }

    // ריצה רציפה ברקע לאיתור השינויים בדף
    setInterval(injectButton, 1000);
})();
