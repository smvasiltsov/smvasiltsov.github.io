document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.expand();

    // --- 1. Theme Detection ---
    // Проверяем тему Telegram и добавляем класс 'dark' к body, если тема темная.
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark');
    }

    const contentDiv = document.getElementById('content');
    const hash = window.location.hash.substring(1);
    
    // --- 2. Data Fetching and Rendering ---
    let markdownText = '# Привет!\n\nЭто ваше мини-приложение для просмотра Markdown. Отправьте боту текст, и он пришлет вам ссылку для его просмотра здесь.\n\n## Пример кода\n\n```python\ndef hello():\n    print("Hello, World!")\n```';

    if (hash.startsWith('data=')) {
        const encodedData = hash.substring('data='.length);
        if (encodedData) {
            try {
                // Современный и надежный способ декодирования UTF-8 из Base64
                const normalizedData = encodedData.replace(/-/g, '+').replace(/_/g, '/');
                const byteString = atob(normalizedData);
                const bytes = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    bytes[i] = byteString.charCodeAt(i);
                }
                markdownText = new TextDecoder('utf-8').decode(bytes);
            } catch (e) {
                console.error('Failed to decode Base64 string:', e);
                markdownText = '# Ошибка\n\nНе удалось декодировать данные. Убедитесь, что ссылка верна.';
            }
        }
    }

    contentDiv.innerHTML = marked.parse(markdownText);

    // --- 3. Syntax Highlighting ---
    // Применяем подсветку ко всем блокам кода после их рендеринга.
    hljs.highlightAll();

    // --- 4. Add "Copy" Buttons ---
    // Находим все блоки <pre> и добавляем в них кнопку.
    document.querySelectorAll('pre').forEach(preElement => {
        const codeElement = preElement.querySelector('code');
        if (!codeElement) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';

        btn.addEventListener('click', () => {
            const codeToCopy = codeElement.innerText;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                btn.textContent = 'Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                btn.textContent = 'Error';
            });
        });

        preElement.appendChild(btn);
    });
});
