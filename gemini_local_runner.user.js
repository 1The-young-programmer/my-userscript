// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  מוסיף כפתור לג'מיני לשליחה והרצה אוטומטית של קוד במחשב המקומי (תומך בכל השפות)
// @match        https://gemini.google.com/*
// @updateURL    https://github.com/1The-young-programmer/my-userscript/raw/main/gemini_local_runner.user.js
// @downloadURL  https://github.com/1The-young-programmer/my-userscript/raw/main/gemini_local_runner.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // פונקציה לשליחת הקוד לשרת המקומי (שמעתה מריץ ישר מהזיכרון)
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

    // פונקציה חכמה לאיתור סרגלי כלים והזרקת הכפתור
    function injectButton() {
        // 1. חיפוש סרגלי כלים רגילים בצ'אט (לפי מחלקות מוכרות)
        let toolbars = Array.from(document.querySelectorAll('.code-block-header, .action-buttons, toolbar.extended-response-toolbar'));

        // 2. זיהוי חכם של סרגל הכלים בקנבס - תומך בכל השפות (מחפש את המילה Colab)
        const allButtons = document.querySelectorAll('button, span[role="button"], div[role="button"]');
        
        for (let btn of allButtons) {
            const text = (btn.textContent || "").toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || "").toLowerCase();
            const tooltip = (btn.getAttribute('data-tooltip') || "").toLowerCase();
            
            // אם מצאנו כפתור שקשור ל-Colab (קיים כמעט תמיד בסרגל העליון)
            if (text.includes('colab') || ariaLabel.includes('colab') || tooltip.includes('colab') || text.includes('קולאב')) {
                let targetToolbar = btn.parentElement;
                
                // מטפסים למעלה בעץ כדי למצוא את השורה המכילה (מיכל ה-flex)
                while (targetToolbar && window.getComputedStyle(targetToolbar).display !== 'flex') {
                    targetToolbar = targetToolbar.parentElement;
                    if (!targetToolbar || targetToolbar === document.body) break;
                }
                
                // מוסיפים את הסרגל לרשימה אם הוא לא שם כבר
                if (targetToolbar && !toolbars.includes(targetToolbar)) {
                    toolbars.push(targetToolbar);
                }
            }
        }

        // 3. הזרקת הכפתור שלנו לכל הסרגלים שנמצאו
        toolbars.forEach(toolbar => {
            // מוודא שהכפתור שלנו טרם הוזרק לסרגל הספציפי הזה
            if (!toolbar.querySelector('.local-run-btn')) {
                const btn = document.createElement('button');
                btn.className = 'local-run-btn';
                btn.innerHTML = '🚀 הפעל מקומית';
                
                // עיצוב שמשתלב יפה בממשק
                btn.style.cssText = 'background-color: #1a73e8; color: white; border: none; padding: 6px 16px; border-radius: 18px; cursor: pointer; margin: 0 10px; font-family: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); transition: background 0.2s;';
                
                // אפקטים במעבר עכבר
                btn.onmouseover = () => btn.style.backgroundColor = '#1557b0';
                btn.onmouseout = () => btn.style.backgroundColor = '#1a73e8';

                btn.onclick = async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    
                    let code = "";
                    // מנסה לשלוף קוד מהעורכים המתקדמים של הקנבס
                    const canvasEditor = document.querySelector('.immersive-editor, .ProseMirror, .cm-content');
                    
                    if (canvasEditor && toolbar.closest('.fullscreen, canvas-ui, [class*="canvas"], .cdk-overlay-container, body')) {
                        code = canvasEditor.innerText || canvasEditor.textContent;
                    } else {
                        // אם זה בלוק רגיל בצ'אט
                        const codeBlock = toolbar.parentElement.querySelector('code, pre');
                        if (codeBlock) code = codeBlock.innerText;
                        else if (canvasEditor) code = canvasEditor.innerText; // ברירת מחדל אחרונה
                    }

                    if (code && code.trim().length > 0) {
                        btn.innerHTML = 'מריץ... ⏳';
                        btn.style.backgroundColor = '#f59e0b'; // כתום-צהוב להמתנה
                        
                        const success = await sendCodeToLocalRunner(code);
                        if(success) {
                            btn.innerHTML = '✅ בוצע!';
                            btn.style.backgroundColor = '#10b981'; // ירוק
                        } else {
                            btn.innerHTML = '❌ שגיאה בשרת';
                            btn.style.backgroundColor = '#ef4444'; // אדום
                        }
                        
                        // החזרת הכפתור למצב רגיל אחרי כמה שניות
                        setTimeout(() => {
                            btn.innerHTML = '🚀 הפעל מקומית';
                            btn.style.backgroundColor = '#1a73e8';
                        }, 3500);
                    } else {
                        alert("לא נמצא קוד להרצה על המסך.");
                    }
                };
                
                // הוספת הכפתור לתחילת שורת הכלים
                toolbar.prepend(btn); 
            }
        });
    }

    // הרצה מחזורית כדי לתפוס את חלון הקנבס שנפתח דינמית
    setInterval(injectButton, 1000);
})();
