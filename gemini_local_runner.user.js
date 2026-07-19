// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  מוסיף כפתור לג'מיני לשליחה והרצה אוטומטית של קוד במחשב המקומי (תומך בכל השפות ומעקף Shadow DOM)
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
            console.error('Error sending code:', error);
            return false;
        }
    }

    function createRunButton() {
        const btn = document.createElement('button');
        btn.className = 'local-run-btn';
        btn.innerHTML = '🚀 הפעל מקומית';
        btn.style.cssText = `
            background-color: #1a73e8; color: white; border: none; 
            padding: 6px 16px; border-radius: 18px; cursor: pointer; 
            margin: 0 10px; font-family: inherit; font-size: 13px; 
            font-weight: 600; display: inline-flex; align-items: center; 
            gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); 
            transition: background 0.2s; z-index: 10000;
        `;
        btn.onmouseover = () => btn.style.backgroundColor = '#1557b0';
        btn.onmouseout = () => btn.style.backgroundColor = '#1a73e8';
        return btn;
    }

    async function handleRunClick(e, btn) {
        e.preventDefault(); e.stopPropagation();
        let code = "";
        
        // עדיפות עליונה: חיפוש בעורכי הקנבס המודרניים
        const cmContent = document.querySelector('.cm-content');
        if (cmContent) {
            code = cmContent.innerText || cmContent.textContent;
        } else {
            // אם לא מצא, מנסה לחפש את הבלוק הקרוב לכפתור
            const codeBlock = btn.closest('.code-block-header, .toolbar, header, canvas-ui')?.parentElement?.querySelector('code, pre');
            if (codeBlock) code = codeBlock.innerText;
        }

        // גיבוי אחרון: חיפוש כללי
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

    function injectButton() {
        let isCanvasButtonInjected = false;

        // 1. הזרקה לבלוקי קוד רגילים בצ'אט
        const chatToolbars = document.querySelectorAll('.code-block-header');
        chatToolbars.forEach(toolbar => {
            if (!toolbar.querySelector('.local-run-btn')) {
                const btn = createRunButton();
                btn.onclick = (e) => handleRunClick(e, btn);
                toolbar.prepend(btn);
            }
        });

        // 2. חיפוש אגרסיבי של סרגל הכלים בקנבס (כולל Shadow DOM או אלמנטים מותאמים)
        // חיפוש טקסטואלי של Colab בכל כפתור או תגית רלוונטית
        const colabKeywords = ['Colab', 'קולאב'];
        let colabButtonFound = null;
        const allPossibleButtons = document.querySelectorAll('button, a, span, div[role="button"], mat-icon');
        
        for (let el of allPossibleButtons) {
            if (el.textContent && colabKeywords.some(keyword => el.textContent.includes(keyword))) {
                colabButtonFound = el;
                break;
            }
        }

        if (colabButtonFound) {
            // נמצא כפתור קולאב, מחפש את מיכל האב שמתאים לסרגל כלים
            let targetToolbar = colabButtonFound.parentElement;
            // עולה למעלה עד שמוצא אזור שמכיל כפתורים נוספים
            let depth = 0;
            while(targetToolbar && depth < 5) {
                if(targetToolbar.querySelectorAll('button, a').length > 1 || targetToolbar.style.display === 'flex') {
                    break;
                }
                targetToolbar = targetToolbar.parentElement;
                depth++;
            }

            if (targetToolbar && !targetToolbar.querySelector('.local-run-btn')) {
                const btn = createRunButton();
                btn.onclick = (e) => handleRunClick(e, btn);
                targetToolbar.insertBefore(btn, targetToolbar.firstChild); // מכניס להתחלה
                isCanvasButtonInjected = true;
                removeFloatingButton();
            } else if (targetToolbar && targetToolbar.querySelector('.local-run-btn')) {
                isCanvasButtonInjected = true; // הכפתור כבר קיים
            }
        }

        // 3. גיבוי חירום מוחלט (כפתור צף) אם אנחנו יודעים שהקנבס פתוח אבל לא מצאנו את הקולאב
        const isCodeEditorOpen = document.querySelector('.cm-content, .immersive-editor');
        if (!isCanvasButtonInjected && isCodeEditorOpen) {
            createFloatingButton();
        } else if (isCanvasButtonInjected || !isCodeEditorOpen) {
            removeFloatingButton();
        }
    }

    function createFloatingButton() {
        if (!document.getElementById('floating-local-run')) {
            const btn = createRunButton();
            btn.id = 'floating-local-run';
            btn.innerHTML = '🚀 הפעל (צף)';
            btn.style.position = 'fixed';
            btn.style.top = '100px';
            btn.style.left = '50px';
            btn.style.zIndex = '999999';
            btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
            btn.style.border = '2px solid white';
            btn.onclick = (e) => handleRunClick(e, btn);
            document.body.appendChild(btn);
        }
    }

    function removeFloatingButton() {
        const floatingBtn = document.getElementById('floating-local-run');
        if (floatingBtn) floatingBtn.remove();
    }

    // במקום רק setInterval, נשתמש גם ב-MutationObserver כדי להגיב מיד לשינויים ב-DOM
    const observer = new MutationObserver((mutations) => {
        // מריץ את בדיקת ההזרקה כשיש שינוי מהותי במסך
        injectButton();
    });

    // מתחיל להאזין לכל העמוד
    observer.observe(document.body, { childList: true, subtree: true });

    // גיבוי ל-Observer, בדיקה מחזורית איטית יותר
    setInterval(injectButton, 1500);

})();
