window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('hidden');
            document.body.classList.remove('loading');
        }, 600); // 600ms grace time for aesthetic spinning purpose
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Reveal Animations on Scroll
    const reveals = document.querySelectorAll('.reveal');
    let demoAnimated = false;

    const runDemoAnimation = async () => {
        if (demoAnimated) return;
        demoAnimated = true;
        
        const demoSteps = document.querySelectorAll('.demo-step');
        demoSteps.forEach(step => {
            step.style.opacity = '0';
            step.style.transform = 'translateY(15px)';
            step.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });

        const showStep = async (index, delay) => {
            await new Promise(r => setTimeout(r, delay));
            if(demoSteps[index]) {
                demoSteps[index].style.opacity = '1';
                demoSteps[index].style.transform = 'translateY(0)';
            }
        };

        const typeMsg = async (insertAfterNode, delayWait, delayType) => {
            await new Promise(r => setTimeout(r, delayWait));
            const typing = document.createElement('div');
            typing.className = 'demo-step typing-mock';
            typing.innerHTML = `<div class="demo-bubble bot-bubble" style="padding:12px 18px; width:fit-content; display:flex; gap:4px; align-items:center;"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
            insertAfterNode.parentNode.insertBefore(typing, insertAfterNode.nextSibling);
            
            void typing.offsetWidth; // force reflow
            typing.style.opacity = '1';
            typing.style.transform = 'translateY(0)';
            
            await new Promise(r => setTimeout(r, delayType));
            typing.style.opacity = '0';
            await new Promise(r => setTimeout(r, 400));
            typing.remove();
        };

        await showStep(0, 500); // 1. User message
        await typeMsg(demoSteps[0], 600, 1500); // bot typing
        await showStep(1, 0); // 2. Bot message 1
        await typeMsg(demoSteps[1], 1000, 2000); // bot typing long
        await showStep(2, 0); // 3. Bot message 2
    };

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        reveals.forEach(reveal => {
            const revealTop = reveal.getBoundingClientRect().top;
            if (revealTop < windowHeight - 100) {
                reveal.classList.add('active');
                if (reveal.classList.contains('ig-mockup')) runDemoAnimation();
            }
        });
    };
    revealOnScroll();

    // --- SINGLE THROTTLED SCROLL HANDLER (performance) ---
    const heroContent = document.querySelector('.hero-content');
    let scrollRAF = null;

    const onScroll = () => {
        if (scrollRAF) return; // already scheduled, skip
        scrollRAF = requestAnimationFrame(() => {
            scrollRAF = null;
            const scrolled = window.scrollY;

            // 1. Reveal animations
            revealOnScroll();

            // 2. Navbar background
            if (scrolled > 50) {
                navbar.style.background = 'rgba(13, 13, 16, 0.95)';
                navbar.style.padding = '15px 5%';
                navbar.classList.remove('at-top');
            } else {
                navbar.style.background = 'transparent';
                navbar.style.padding = '20px 5%';
                navbar.classList.add('at-top');
            }

            // 3. Parallax (only in hero range, cheap check first)
            if (scrolled < 600 && heroContent) {
                heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
                heroContent.style.opacity = 1 - (scrolled / 500);
            }
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });


    // Web3Forms AJAX Submission
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            const originalText = btn.textContent;

            // Estado de carga
            btn.textContent = 'Enviando...';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            const formData = new FormData(form);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);

            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: json
                });

                if (response.status === 200) {
                    btn.textContent = '¡Enviado con éxito!';
                    btn.style.background = '#4CAF50';
                    btn.style.color = 'white';
                    form.reset();
                } else {
                    btn.textContent = 'Error al enviar';
                    btn.style.background = '#f44336';
                }
            } catch (error) {
                btn.textContent = 'Error de conexión';
                btn.style.background = '#f44336';
            } finally {
                btn.style.opacity = '1';

                // Restaurar botón después de unos segundos
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.style.pointerEvents = 'auto';
                }, 4000);
            }
        });
    }



    // --- ANALYTICS EVENT TRACKING ---
    const trackEvent = (eventName, params = {}) => {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
            // console.log(`Analytics Event: ${eventName}`, params);
        }
    };

    // Track clicks on primary CTA buttons
    document.querySelectorAll('.btn-primary, .btn-cta-nav, .btn-secondary').forEach(btn => {
        btn.addEventListener('click', () => {
            trackEvent('click_cta', {
                button_text: btn.textContent.trim(),
                location: window.location.pathname + window.location.hash
            });
        });
    });

    // Track social media links
    document.querySelectorAll('.social-link, .ig-link').forEach(link => {
        link.addEventListener('click', () => {
            trackEvent('click_social', {
                platform: link.textContent.trim() || 'social',
                url: link.href
            });
        });
    });

    // --- CHATBOT LOGIC ---
    // El chatbot ahora usa la función segura de Netlify (/api/chat)

    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatToggle = document.getElementById('chat-toggle');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const chatMessages = document.getElementById('chat-messages');

    // --- SPEECH RECOGNITION LOGIC ---
    let recognition = null;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            chatInput.value = finalTranscript || interimTranscript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isRecording = false;
            micBtn.classList.remove('recording');
        };

        recognition.onend = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            chatInput.focus();
        };

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                if (isRecording) {
                    recognition.stop();
                } else {
                    chatInput.value = '';
                    recognition.start();
                }
            });
        }
    } else {
        if (micBtn) micBtn.style.display = 'none'; // Navegador no compatible
    }

    // --- TOOLTIP LOGIC ---
    const chatTooltip = document.getElementById('chat-tooltip');
    if (chatTooltip) {
        setTimeout(() => {
            if (!chatbotWidget.classList.contains('active')) {
                chatTooltip.classList.add('show');
            }
        }, 3000);
        
        const closeTooltipBtn = document.getElementById('close-tooltip');
        if (closeTooltipBtn) {
            closeTooltipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                chatTooltip.classList.remove('show');
            });
        }
    }

    // Toggle Chat Window
    const toggleChat = () => {
        chatbotWidget.classList.toggle('active');
        if (chatTooltip) chatTooltip.classList.remove('show');
        if (chatbotWidget.classList.contains('active')) {
            chatInput.focus();
        }
    };

    chatToggle.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);

    // Send Message
    const appendMessage = (text, type, animate = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        
        if (!animate) {
            msgDiv.innerHTML = `<p>${text}</p>`;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            msgDiv.innerHTML = `<p></p>`;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            const pElement = msgDiv.querySelector('p');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text; // Parsed HTML structure
            
            const appendNodeProgressively = async (node, parent) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const content = node.textContent;
                    for (let char of content) { // Character-safe iteration (handles emojis)
                        parent.appendChild(document.createTextNode(char));
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        await new Promise(r => setTimeout(r, 15)); // typing speed
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const newElem = document.createElement(node.tagName);
                    Array.from(node.attributes).forEach(attr => newElem.setAttribute(attr.name, attr.value));
                    parent.appendChild(newElem);
                    for (let child of Array.from(node.childNodes)) {
                        await appendNodeProgressively(child, newElem);
                    }
                }
            };

            (async () => {
                for (let node of Array.from(tempDiv.childNodes)) {
                    await appendNodeProgressively(node, pElement);
                }
            })();
        }
        return msgDiv;
    };

    const handleSendMessage = async () => {
        const text = chatInput.value.trim();
        if (text === '' || text === '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') return;

        trackEvent('chat_message_sent');
        appendMessage(text, 'user');
        chatInput.value = '';

        // Show "Typing..." state
        const typingIndicator = appendMessage('PlayBot está escribiendo...', 'bot');
        typingIndicator.classList.add('typing');

        try {
            // Llamamos a nuestra propia API en Netlify para que la clave sea segura
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            typingIndicator.remove();

            if (data.response) {
                appendMessage(data.response, 'bot', true);
            } else if (data.error) {
                console.error('Chat Error:', data.error);
                appendMessage(`Lo siento, ha habido un error: ${data.error}`, 'bot');
            } else {
                appendMessage('Lo siento, no he podido procesar tu respuesta.', 'bot');
            }
        } catch (error) {
            typingIndicator.remove();
            console.error('Error:', error);
            appendMessage('Error de conexión con el servidor.', 'bot');
        }
    };

    const getMockResponse = (input) => {
        const query = input.toLowerCase();
        if (query.includes('precio') || query.includes('coste') || query.includes('cuanto vale')) {
            return 'Nuestros planes empiezan desde 49,99€ de setup inicial y una cuota mensual de solo 29,99€ para la implementación básica. ¿Te gustaría ver el detalle de los servicios?';
        }
        if (query.includes('servicio') || query.includes('haces') || query.includes('ofreces')) {
            return 'Ofrecemos automatización de DMs, chatbots inteligentes, captura de leads y embudos de venta en redes sociales. ¡Todo para que no pierdas ni un cliente!';
        }
        if (query.includes('contacto') || query.includes('hablar') || query.includes('llamada')) {
            return 'Puedes agendar una llamada directamente desde el botón de "Agendar Llamada" en la sección de contacto, o dejarme tus datos por aquí.';
        }
        return '¡Gracias por tu mensaje! 🚀 Actualmente estoy en modo offline. Una vez que subas la web a Vercel/Netlify con tu API Key, podré responderte con inteligencia artificial avanzada.';
    };

    sendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
});
