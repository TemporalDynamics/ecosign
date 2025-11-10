
document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
        });
    }

    // --- FAQ Accordion ---
    const faqContainer = document.getElementById('faq-container');
    if (faqContainer) {
        faqContainer.addEventListener('click', (event) => {
            const questionButton = event.target.closest('.faq-question');
            if (questionButton) {
                const isExpanded = questionButton.getAttribute('aria-expanded') === 'true';
                
                // Close all questions before opening the new one
                faqContainer.querySelectorAll('.faq-question').forEach(btn => {
                    if (btn !== questionButton) {
                        btn.setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle the clicked one
                questionButton.setAttribute('aria-expanded', !isExpanded);
            }
        });
    }

    // --- Auth Placeholder Logic ---
    const handleAuthAction = (e) => {
        e.preventDefault();
        // In a real app, this would trigger the respective auth flow.
        // For the prototype, we just redirect to the dashboard.
        window.location.href = 'dashboard.html';
    };

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAuthAction);
    }
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleAuthAction);
    }
    
    // Social Login/Signup Buttons
    const googleLoginButton = document.getElementById('google-login-button');
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', handleAuthAction);
    }
    const githubLoginButton = document.getElementById('github-login-button');
    if (githubLoginButton) {
        githubLoginButton.addEventListener('click', handleAuthAction);
    }
    const googleSignupButton = document.getElementById('google-signup-button');
    if (googleSignupButton) {
        googleSignupButton.addEventListener('click', handleAuthAction);
    }
    const githubSignupButton = document.getElementById('github-signup-button');
    if (githubSignupButton) {
        githubSignupButton.addEventListener('click', handleAuthAction);
    }


    // --- Public Verifier Logic (verify.html) ---
    const fileUpload = document.getElementById('file-upload');
    const fileDropZone = document.getElementById('file-drop-zone');
    const dropZoneText = document.getElementById('drop-zone-text');
    const verifyButton = document.getElementById('verify-button');
    const verifyButtonText = document.getElementById('verify-button-text');
    const verifySpinner = document.getElementById('verify-spinner');
    const uploaderSection = document.getElementById('uploader-section');
    const resultSection = document.getElementById('result-section');
    const verifyAnotherButton = document.getElementById('verify-another-button');

    let selectedFile = null;

    async function calculateFileHash(file) {
        const fileBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    if (fileUpload && verifyButton && resultSection && uploaderSection) {
        const updateUploaderUI = () => {
            if (selectedFile) {
                dropZoneText.innerHTML = `Archivo seleccionado: <strong class="font-semibold text-[var(--color-primary-cyan)]">${selectedFile.name}</strong>`;
                verifyButton.disabled = false;
                verifyButton.classList.remove('bg-gray-300', 'cursor-not-allowed');
                verifyButton.classList.add('cta-button', 'shadow-md');
            } else {
                dropZoneText.innerHTML = `Arrastra y suelta un archivo .eco aquí, o <label for="file-upload" class="relative cursor-pointer font-semibold text-[var(--color-primary-cyan)] hover:opacity-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[var(--color-primary-cyan)]"><span>haz clic para seleccionar</span></label>`;
                verifyButton.disabled = true;
                verifyButton.classList.add('bg-gray-300', 'cursor-not-allowed');
                verifyButton.classList.remove('cta-button', 'shadow-md');
            }
        };

        fileUpload.addEventListener('change', (event) => {
            selectedFile = event.target.files[0];
            updateUploaderUI();
        });

        fileDropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            fileDropZone.classList.add('dragover');
        });
        fileDropZone.addEventListener('dragleave', (event) => {
            event.preventDefault();
            fileDropZone.classList.remove('dragover');
        });
        fileDropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            fileDropZone.classList.remove('dragover');
            if (event.dataTransfer.files.length > 0 && event.dataTransfer.files[0].name.endsWith('.eco')) {
                fileUpload.files = event.dataTransfer.files;
                const changeEvent = new Event('change');
                fileUpload.dispatchEvent(changeEvent);
            }
        });

        verifyButton.addEventListener('click', async () => {
            if (!selectedFile) return;

            verifyButton.disabled = true;
            verifyButtonText.textContent = 'Procesando...';
            verifySpinner.classList.remove('hidden');

            const fileHash = await calculateFileHash(selectedFile);

            setTimeout(() => {
                const isInvalid = selectedFile.name.toLowerCase().includes('alterado');
                let result;

                if (isInvalid) {
                    result = {
                        status: 'Inválido',
                        fileName: selectedFile.name,
                        hash: fileHash,
                        timestamp: '2024-07-01T10:00:00Z',
                        signers: [
                            { name: 'Juan Pérez', email: 'juan.perez@example.com', status: 'Verificado' },
                            { name: 'Maria García', email: 'maria.garcia@example.com', status: 'Firma no coincide' }
                        ],
                        conclusion: 'El archivo ha sido alterado después de la última firma. La integridad del documento está comprometida.'
                    };
                } else {
                     result = {
                        status: 'Válido',
                        fileName: selectedFile.name,
                        hash: fileHash,
                        timestamp: '2024-07-15T14:30:00Z',
                        signers: [
                             { name: 'Juan Pérez', email: 'juan.perez@example.com', status: 'Verificado' },
                             { name: 'Maria García', email: 'maria.garcia@example.com', status: 'Verificado' }
                        ],
                        conclusion: 'El archivo es auténtico y no ha sido modificado desde su último sello. Todas las firmas han sido verificadas con éxito.'
                    };
                }

                renderCertificate(result);
                uploaderSection.classList.add('hidden');
                resultSection.classList.remove('hidden');

                verifyButton.disabled = false;
                verifyButtonText.textContent = 'Verificar Autenticidad';
                verifySpinner.classList.add('hidden');

            }, 1500);
        });
        
        verifyAnotherButton.addEventListener('click', () => {
            resultSection.classList.add('hidden');
            uploaderSection.classList.remove('hidden');
            selectedFile = null;
            fileUpload.value = '';
            updateUploaderUI();
        });
    }

    function renderCertificate(data) {
        document.getElementById('file-name-display').textContent = data.fileName;
        const docHashEl = document.getElementById('doc-hash');
        docHashEl.textContent = data.hash;
        document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString('es-MX');
        document.getElementById('integrity-conclusion').textContent = data.conclusion;
        
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        const certHeader = document.getElementById('certificate-header');
        
        statusBadge.className = 'mt-4 sm:mt-0 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2';
        certHeader.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2';

        if (data.status === 'Válido') {
            statusBadge.classList.add('bg-green-100', 'text-green-800');
            certHeader.classList.add('border-green-500');
            statusText.textContent = 'Válido';
            statusIcon.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
        } else {
            statusBadge.classList.add('bg-red-100', 'text-red-800');
            certHeader.classList.add('border-red-500');
            statusText.textContent = 'Inválido / Alterado';
            statusIcon.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
        }
        
        const signersList = document.getElementById('signers-list');
        signersList.innerHTML = '';
        data.signers.forEach(signer => {
            const isVerified = signer.status === 'Verificado';
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-md border';
            li.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-900">${signer.name}</p>
                    <p class="text-sm text-gray-500">${signer.email}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${signer.status}
                </span>
            `;
            signersList.appendChild(li);
        });

        document.getElementById('copy-hash-button').onclick = () => {
            navigator.clipboard.writeText(docHashEl.textContent);
        };
    }

    // --- Dashboard Modals Logic (dashboard.html) ---
    const newDocButton = document.getElementById('new-doc-button');
    const newDocModal = document.getElementById('new-doc-modal');
    const historyModal = document.getElementById('history-modal');
    
    if (newDocButton && newDocModal && historyModal) {
        
        // --- Modal Opening/Closing Generic Logic ---
        const openModal = (modal) => {
            modal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        };
        const closeModal = (modal) => {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        };

        newDocButton.addEventListener('click', () => openModal(newDocModal));

        document.querySelectorAll('.history-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const filename = row.dataset.filename;
                const historyData = JSON.parse(row.dataset.history);
                
                populateHistoryModal(filename, historyData);
                openModal(historyModal);
            });
        });

        [newDocModal, historyModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-close-button]')) {
                    closeModal(modal);
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                if (!newDocModal.classList.contains('hidden')) closeModal(newDocModal);
                if (!historyModal.classList.contains('hidden')) closeModal(historyModal);
            }
        });

        // --- New Document Modal Specific Logic ---
        const newDocForm = document.getElementById('new-doc-form');
        const modalFileUpload = document.getElementById('modal-file-upload');
        const modalDropZoneText = document.getElementById('modal-drop-zone-text');
        const signerEmailInput = document.getElementById('signer-email-input');
        const addSignerButton = document.getElementById('add-signer-button');
        const signersListModal = document.getElementById('signers-list-modal');
        const sendButton = document.getElementById('send-for-signature-button');
        
        let modalSelectedFile = null;
        let signers = [];

        const updateSendButtonState = () => {
            if (modalSelectedFile && signers.length > 0) {
                sendButton.disabled = false;
                sendButton.classList.remove('bg-gray-300', 'cursor-not-allowed');
            } else {
                sendButton.disabled = true;
                sendButton.classList.add('bg-gray-300', 'cursor-not-allowed');
            }
        };

        modalFileUpload.addEventListener('change', (e) => {
            modalSelectedFile = e.target.files[0];
            if (modalSelectedFile) {
                modalDropZoneText.innerHTML = `Archivo: <strong class="font-semibold text-[var(--color-primary-cyan)]">${modalSelectedFile.name}</strong>`;
            }
            updateSendButtonState();
        });

        const renderSigners = () => {
            signersListModal.innerHTML = '';
            signers.forEach((email, index) => {
                const li = document.createElement('li');
                li.className = 'flex items-center justify-between p-2 bg-gray-100 rounded text-sm';
                li.innerHTML = `
                    <span class="text-gray-800">${email}</span>
                    <button type="button" data-index="${index}" class="remove-signer-button p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus-ring">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="pointer-events: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                `;
                signersListModal.appendChild(li);
            });
            updateSendButtonState();
        };

        addSignerButton.addEventListener('click', () => {
            const email = signerEmailInput.value.trim();
            if (email && /^\S+@\S+\.\S+$/.test(email) && !signers.includes(email)) {
                signers.push(email);
                signerEmailInput.value = '';
                renderSigners();
            }
        });
        
        signerEmailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSignerButton.click();
            }
        });

        signersListModal.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-signer-button');
            if (removeButton) {
                const indexToRemove = parseInt(removeButton.dataset.index, 10);
                signers.splice(indexToRemove, 1);
                renderSigners();
            }
        });
        
        newDocForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!sendButton.disabled) {
                // In a real app, this would submit the data.
                console.log('Submitting:', { file: modalSelectedFile, signers });
                alert('Documento enviado para firma (simulación).');
                closeModal(newDocModal);
                // Reset form
                modalSelectedFile = null;
                signers = [];
                newDocForm.reset();
                modalDropZoneText.innerHTML = `Arrastra y suelta un archivo, o <span class="font-semibold text-[var(--color-primary-cyan)]">selecciona uno</span>`;
                renderSigners();
            }
        });
        
        // --- History Modal Specific Logic ---
        const populateHistoryModal = (filename, historyData) => {
            document.getElementById('history-filename').textContent = filename;
            const timeline = document.getElementById('history-timeline');
            timeline.innerHTML = ''; // Clear previous history
            
            historyData.forEach(item => {
                const li = document.createElement('li');
                li.className = 'relative pl-8';
                
                const iconContainer = document.createElement('div');
                iconContainer.className = 'absolute left-0 top-1 flex items-center justify-center w-5 h-5 bg-white rounded-full ring-4 ring-gray-200';
                let icon = '';
                if(item.event.includes('Creado')) icon = `<svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"></path></svg>`;
                else if(item.event.includes('Firmado')) icon = `<svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clip-rule="evenodd"></path></svg>`;
                else if(item.event.includes('Error')) icon = `<svg class="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"></path></svg>`;
                else icon = `<svg class="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M3 8.75A.75.75 0 013.75 8h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8.75zM3.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H3.75z"></path></svg>`;
                
                iconContainer.innerHTML = icon;

                const border = document.createElement('div');
                border.className = 'absolute left-2.5 top-6 bottom-0 w-px bg-gray-200';

                const content = document.createElement('div');
                content.innerHTML = `
                    <p class="text-sm font-semibold text-gray-800">${item.event}</p>
                    <p class="text-xs text-gray-500">por: ${item.user}</p>
                    <time class="block text-xs text-gray-500 mt-0.5">${new Date(item.timestamp).toLocaleString('es-MX')}</time>
                `;

                li.appendChild(iconContainer);
                li.appendChild(border);
                li.appendChild(content);

                timeline.appendChild(li);
            });
             // Remove border from the last item
            if (timeline.lastChild) {
                const lastBorder = timeline.lastChild.querySelector('.absolute.left-2\\.5');
                if(lastBorder) lastBorder.remove();
            }
        };
    }
});