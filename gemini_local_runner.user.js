// ==UserScript==
// @name         Gemini Local Auto-Runner
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Universal Floating Button - עוקף את חסימות הממשק עם כפתור מרחף קבוע
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

    // אלגוריתם שסורק כל פינה בעמוד כדי למצוא עורכי קוד, גם בתוך Shadow DOM
    function getAllCodeBlocks() {
        const results = [];
        function searchNode(node) {
            if (node.nodeType === 1) {
                // חיפוש עורכי קוד מודרניים או בלוקים רגילים
                if (node.matches('.cm-content, .monaco-editor, .ProseMirror, pre code, .code-block code')) {
                    results.push(node);
                }
            }
            if (node.shadowRoot) {
                searchNode(node.shadowRoot);
            }
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    searchNode(node.children[i]);
                }
            }
        }
        searchNode(document.body);
        return results;
    }

    function extractBestCode() {
        // קודם כל נבדוק אם המשתמש סימן טקסט עם העכבר (הכי מדויק)
        const selection = window.getSelection().toString();
        if (selection && selection.length > 10) {
            return selection;
        }

        // אם לא סימן כלום, נחפש את כל בלוקי הקוד בעמוד
        const codeBlocks = getAllCodeBlocks();
        
        // נמצא את בלוק הקוד הארוך ביותר או האחרון (בדרך כלל מה שהמשתמש רוצה להריץ)
        let bestCode = "";
        for (let i = codeBlocks.length - 1; i >= 0; i--) {
            let el = codeBlocks[i];
            let text = el.innerText || el.textContent;
            if (text && text.trim().length > 10) {
                bestCode = text;
                break; // תופס את בלוק הקוד הרלוונטי האחרון
            }
        }
        return bestCode;
    }

    function createUniversalFloatingButton() {
        // נוודא שלא ניצור פעמיים
        if (document.getElementById('gemini-universal-runner')) return;

        const btn = document.createElement('button');
        btn.id = 'gemini-universal-runner';
        btn.innerHTML = '🚀 <span style="font-family: inherit;">הפעל קוד</span>';
        
        // עיצוב מרחף מודרני שלא מפריע לעין
        btn.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 24px;
            background: linear-gradient(135deg, #1a73e8, #1557b0);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 50px;
            cursor: pointer;
            font-size: 15px;
            font-weight: bold;
            box-shadow: 0 4px 14px rgba(26, 115, 232, 0.4);
            z-index: 2147483647; /* המספר הכי גבוה שיש כדי שתמיד יהיה מעל הכל */
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease-in-out;
            opacity: 0.85; /* חצי שקוף כדי לא להסתיר תוכן */
        `;

        // אפקטים של מעבר עכבר
        btn.onmouseover = () => {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1.05)';
        };
        btn.onmouseout = () => {
            btn.style.opacity = '0.85';
            btn.style.transform = 'scale(1)';
        };

        btn.onclick = async (e) => {
            e.preventDefault();
            
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '⏳ <span style="font-family: inherit;">שואב קוד...</span>';
            btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; // כתום

            const codeToRun = extractBestCode();

            if (codeToRun && codeToRun.trim().length > 0) {
                btn.innerHTML = '⚙️ <span style="font-family: inherit;">מריץ...</span>';
                
                const success = await sendCodeToLocalRunner(codeToRun);
                if (success) {
                    btn.innerHTML = '✅ <span style="font-family: inherit;">בוצע!</span>';
                    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)'; // ירוק
                } else {
                    btn.innerHTML = '❌ <span style="font-family: inherit;">שגיאה!</span>';
                    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; // אדום
                }
            } else {
                alert("לא מצאתי קוד על המסך להריץ.\nנסה לסמן את הקוד שאתה רוצה להריץ עם העכבר, ואז ללחוץ שוב.");
                btn.innerHTML = originalHtml;
                btn.style.background = 'linear-gradient(135deg, #1a73e8, #1557b0)';
                return;
            }

            // החזרה למצב רגיל אחרי 3 שניות
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.background = 'linear-gradient(135deg, #1a73e8, #1557b0)';
            }, 3000);
        };

        document.body.appendChild(btn);
    }

    // מפעיל את יצירת הכפתור מיד
    createUniversalFloatingButton();
    
    // מוודא שהכפתור נשאר שם גם אם ג'מיני מנקה את העמוד
    setInterval(createUniversalFloatingButton, 2000);

})();
