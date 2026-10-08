import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const elements = {
    appStatus: document.getElementById('appStatus'),
    adminPanel: document.getElementById('adminPanel'),
    adminStatus: document.getElementById('adminStatus'),
    adminToggleButton: document.getElementById('adminToggleButton'),
    signOutButton: document.getElementById('signOutButton'),
    loginForm: document.getElementById('loginForm'),
    departmentForm: document.getElementById('departmentForm'),
    adminDepartmentManagement: document.getElementById('adminDepartmentManagement'),
    adminDepartmentList: document.getElementById('adminDepartmentList'),
    directorySearch: document.getElementById('directorySearch'),
    searchResults: document.getElementById('searchResults'),
    leadership: document.getElementById('leadership'),
    mainDepartments: document.getElementById('mainDepartments'),
    tvLeft: document.getElementById('tvLeft'),
    tvRight: document.getElementById('tvRight'),
    askDepartments: document.getElementById('askDepartments'),
    emptyChartMessage: document.getElementById('emptyChartMessage'),
    infoModal: document.getElementById('infoModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    closeModalButton: document.getElementById('closeModalButton')
};

const departmentIcons = {
    'BOARD OF DIRECTORS': 'fa-crown',
    'MANAGING DIRECTOR': 'fa-user-tie',
    'GENERAL MANAGER': 'fa-briefcase',
    'FINANCE ACCOUNTANT': 'fa-calculator',
    'ROYAL TV GENERAL MANAGER': 'fa-tv',
    'HEAD OF IT': 'fa-server',
    'DIGITAL MARKETER AND BLOGGER': 'fa-bullhorn',
    'ROYAL TV ACCRA MANAGER': 'fa-tv',
    'HR MANAGER': 'fa-users',
    'RICHCITY & ESTATES MANAGER': 'fa-building',
    'A&A TRAVEL & TOURS MANAGER': 'fa-plane-departure',
    'ASK FOODS MANAGERS': 'fa-utensils',
    'A&A DRIVING SCH MANAGER': 'fa-car',
    'MM': 'fa-bullhorn',
    'PROGRAMS': 'fa-list-check',
    'CLIENT SERVICE MANAGER': 'fa-headset',
    'PRODUCTION MANAGER': 'fa-video',
    'HEAD OF IT BOP': 'fa-server',
    'STUDIO MANAGER': 'fa-photo-video',
    'PROPRIETOR': 'fa-user-shield',
    'HEAD OF SCHOOL': 'fa-user-graduate',
    'TEACHERS': 'fa-chalkboard-teacher'
};

const departmentDisplayNames = {
    'HEAD OF IT BOP': 'DIRECTOR OF PHOTOGRAPHY',
    'STUDIO MANAGER': 'STUDIO MANAGERS',
    'PROGRAMS': 'PROGRAMS MANAGER',
    'PROGRAMS MANAGER': 'PROGRAMS MANAGER',
    'MM': 'MARKETING MANAGER'
};

let supabase;
let departments = [];
let staff = [];
let members = [];
let isAdmin = false;
let currentSession = null;

function setStatus(message, kind = 'info') {
    elements.appStatus.textContent = message;
    elements.appStatus.dataset.kind = kind;
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function displayName(department) {
    return departmentDisplayNames[department.name] || department.name;
}

function departmentButton(department, className) {
    const button = makeElement('button', className);
    button.type = 'button';
    button.dataset.departmentId = department.id;
    const icon = makeElement('i', `fas ${departmentIcons[department.name] || 'fa-folder'}`);
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, makeElement('span', '', displayName(department)));
    return button;
}

function renderChart() {
    elements.leadership.replaceChildren();
    elements.mainDepartments.replaceChildren();
    elements.tvLeft.replaceChildren();
    elements.tvRight.replaceChildren();
    elements.askDepartments.replaceChildren();

    const ordered = [...departments].sort((a, b) =>
        a.sort_order - b.sort_order || a.id - b.id
    );
    const leaders = ordered.filter(department => department.position_type === 'director');
    leaders.forEach((department, index) => {
        if (index > 0) {
            const connector = makeElement('span', 'connector-vertical');
            connector.setAttribute('aria-hidden', 'true');
            elements.leadership.append(connector);
        }
        elements.leadership.append(departmentButton(department, 'top-box'));
    });

    ordered
        .filter(department =>
            ['core', 'sub'].includes(department.position_type) &&
            !['PROGRAMS MANAGER', 'MARKETING MANAGER'].includes(department.name)
        )
        .forEach(department => {
            elements.mainDepartments.append(departmentButton(department, 'yellow-bar-btn'));
        });

    ordered
        .filter(department =>
            department.position_type === 'tv_left' && department.name !== 'MARKETING MANAGER'
        )
        .forEach(department => {
            elements.tvLeft.append(departmentButton(department, 'branch-btn'));
        });

    ordered
        .filter(department => department.position_type === 'tv_right')
        .forEach(department => {
            elements.tvRight.append(departmentButton(department, 'branch-btn'));
        });

    ordered
        .filter(department => department.position_type === 'ask_institute')
        .forEach(department => {
            elements.askDepartments.append(departmentButton(department, 'branch-btn'));
        });

    elements.emptyChartMessage.hidden = departments.length > 0;
    renderAdminDepartments();
}

function renderAdminDepartments() {
    elements.adminDepartmentList.replaceChildren();
    elements.adminDepartmentManagement.hidden = !isAdmin;
    if (!isAdmin) return;

    [...departments]
        .sort((a, b) => displayName(a).localeCompare(displayName(b)))
        .forEach(department => {
            const button = makeElement('button', 'secondary-button', `Manage ${displayName(department)}`);
            button.type = 'button';
            button.dataset.departmentId = department.id;
            elements.adminDepartmentList.append(button);
        });
}

async function ensureRoyalTvDepartments() {
    const required = [
        { name: 'HEAD OF IT', position_type: 'tv_right', sort_order: 40 },
        { name: 'DIGITAL MARKETER AND BLOGGER', position_type: 'tv_left', sort_order: 40 },
        { name: 'ROYAL TV ACCRA MANAGER', position_type: 'tv_left', sort_order: 50 }
    ];
    const existingNames = new Set(departments.map(department => department.name));
    const missing = required.filter(department => !existingNames.has(department.name));
    if (missing.length === 0) return;

    const { error } = await supabase.from('departments').insert(missing);
    if (error) throw error;
    await loadData();
}

function renderSearchResults() {
    const term = elements.directorySearch.value.trim().toLocaleLowerCase();
    elements.searchResults.replaceChildren();
    elements.searchResults.hidden = term.length === 0;
    if (!term) return;

    const results = [];
    departments.forEach(department => {
        if (`${department.name} ${displayName(department)} ${department.manager_name}`
            .toLocaleLowerCase().includes(term)) {
            results.push({
                type: 'department',
                id: department.id,
                title: displayName(department),
                detail: department.manager_name ? `Manager: ${department.manager_name}` : 'Department'
            });
        }
    });
    staff.forEach(person => {
        if (`${person.name} ${person.role}`.toLocaleLowerCase().includes(term)) {
            results.push({
                type: 'staff',
                title: person.name,
                detail: person.role || 'Staff'
            });
        }
    });
    members.forEach(member => {
        const department = departments.find(item => item.id === member.department_id);
        if (`${member.name} ${member.role} ${department?.name || ''}`.toLocaleLowerCase().includes(term)) {
            results.push({
                type: 'department',
                id: member.department_id,
                title: member.name,
                detail: [member.role, department ? displayName(department) : 'Department member']
                    .filter(Boolean)
                    .join(' · ')
            });
        }
    });

    if (results.length === 0) {
        elements.searchResults.append(makeElement('p', 'empty-message', 'No matching departments or staff.'));
        return;
    }

    results.slice(0, 30).forEach(result => {
        const button = makeElement('button', 'search-result');
        button.type = 'button';
        button.dataset.resultType = result.type;
        if (result.id !== undefined) button.dataset.departmentId = result.id;
        button.append(makeElement('span', '', result.title), makeElement('small', '', result.detail));
        elements.searchResults.append(button);
    });
}

function openModal(title) {
    elements.modalTitle.textContent = title;
    elements.modalBody.replaceChildren();
    elements.infoModal.hidden = false;
    elements.closeModalButton.focus();
}

function closeModal() {
    elements.infoModal.hidden = true;
    elements.modalBody.replaceChildren();
}

function addMessage(container, text, kind = 'info') {
    const message = makeElement('p', 'modal-message', text);
    message.dataset.kind = kind;
    container.append(message);
    return message;
}

function removeDarkBackgroundFromLogo(image) {
    if (!image || image.dataset.whiteBackgroundApplied === 'true') return;

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const brightness = (red + green + blue) / 3;
        if (brightness < 70 && Math.abs(red - green) < 30 && Math.abs(green - blue) < 30) {
            pixels[index] = 255;
            pixels[index + 1] = 255;
            pixels[index + 2] = 255;
        }
    }

    context.putImageData(imageData, 0, 0);
    image.src = canvas.toDataURL('image/jpeg');
    image.dataset.whiteBackgroundApplied = 'true';
    image.style.background = '#ffffff';
}

function makeFormField(labelText, name, options = {}) {
    const label = makeElement('label', '', labelText);
    const input = makeElement(options.select ? 'select' : 'input');
    input.name = name;
    if (options.select) {
        [
            ['director', 'Leadership'],
            ['core', 'Main departments'],
            ['sub', 'Main departments (secondary)'],
            ['tv_left', 'Royal TV Channel (left)'],
            ['tv_right', 'Royal TV Channel (right)'],
            ['ask_institute', 'ASK Practical Institute']
        ].forEach(([value, text]) => {
            const option = makeElement('option', '', text);
            option.value = value;
            input.append(option);
        });
    } else {
        input.type = options.type || 'text';
        input.maxLength = options.maxLength || 150;
        input.required = options.required !== false;
        if (options.value !== undefined) input.value = options.value;
        if (options.autocomplete) input.autocomplete = options.autocomplete;
    }
    label.append(input);
    return label;
}

function appendMemberList(container, department) {
    const heading = makeElement('h3', '', `Members (${members.filter(member => member.department_id === department.id).length})`);
    container.append(heading);
    const departmentMembers = members
        .filter(member => member.department_id === department.id)
        .sort((a, b) => a.id - b.id);
    if (departmentMembers.length === 0) {
        container.append(makeElement('p', 'modal-message', 'No members added to this department yet.'));
        return;
    }

    const list = makeElement('ul', 'member-list');
    departmentMembers.forEach(member => {
        const item = makeElement('li');
        item.append(makeElement('strong', '', member.name));
        if (member.role) item.append(document.createTextNode(` — ${member.role}`));
        if (isAdmin) {
            if (member.role === 'Manager') {
                item.append(makeElement('small', 'record-note', 'Edit this name in the manager section below.'));
            } else {
                renderManageableName(item, member, 'department_members', () => openDepartment(department.id));
            }
        }
        list.append(item);
    });
    container.append(list);
}

function renderManageableName(item, record, table, onChange, options = {}) {
    const renderDisplay = () => {
        const displayName = options.displayName ? options.displayName(record) : record.name;
        item.replaceChildren(makeElement('strong', '', displayName));
        if (record.role) item.append(document.createTextNode(` — ${record.role}`));

        const actions = makeElement('div', 'record-actions');
        const editButton = makeElement('button', 'secondary-button', 'Edit name');
        editButton.type = 'button';
        editButton.addEventListener('click', () => renderEditor());
        const deleteButton = makeElement('button', 'secondary-button danger-button', 'Delete');
        deleteButton.type = 'button';
        deleteButton.addEventListener('click', async () => {
            const prompt = options.deletePrompt || `Delete ${record.name}? This cannot be undone.`;
            if (!window.confirm(prompt)) return;
            deleteButton.disabled = true;
            try {
                const { error } = await supabase.from(table).delete().eq('id', record.id);
                if (error) throw error;
                await loadData();
                (options.onDelete || onChange)();
            } catch (error) {
                deleteButton.disabled = false;
                addMessage(item, `Could not delete entry: ${error.message}`, 'error');
            }
        });
        actions.append(editButton, deleteButton);
        item.append(actions);
    };

    const renderEditor = () => {
        item.replaceChildren();
        const form = makeElement('form', 'record-edit-form');
        const nameField = makeFormField('Name', 'name', { value: record.name });
        const nameInput = nameField.querySelector('input');
        const buttons = makeElement('div', 'record-actions');
        const saveButton = makeElement('button', 'secondary-button', 'Save');
        saveButton.type = 'submit';
        const cancelButton = makeElement('button', 'secondary-button', 'Cancel');
        cancelButton.type = 'button';
        cancelButton.addEventListener('click', renderDisplay);
        buttons.append(saveButton, cancelButton);
        form.append(nameField, buttons);
        const message = addMessage(form, '');
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.setCustomValidity('Enter a name.');
                nameInput.reportValidity();
                nameInput.addEventListener('input', () => nameInput.setCustomValidity(''), { once: true });
                return;
            }

            saveButton.disabled = true;
            message.textContent = 'Saving…';
            try {
                const { error } = await supabase.from(table).update({ name }).eq('id', record.id);
                if (error) throw error;
                record.name = name;
                await loadData();
                onChange();
            } catch (error) {
                message.textContent = `Could not save name: ${error.message}`;
                message.dataset.kind = 'error';
                saveButton.disabled = false;
            }
        });
        item.append(form);
        nameInput.focus();
        nameInput.select();
    };

    renderDisplay();
}

function openDepartment(departmentId) {
    const department = departments.find(item => item.id === Number(departmentId));
    if (!department) {
        setStatus('That department is no longer available. Refresh the page and try again.', 'error');
        return;
    }

    openModal(`${displayName(department)} details`);
    const summary = makeElement('section', 'modal-section');
    summary.append(makeElement('h3', '', 'Department'));
    if (isAdmin) {
        const list = makeElement('ul', 'member-list');
        const item = makeElement('li');
        renderManageableName(item, department, 'departments', () => openDepartment(department.id), {
            displayName,
            deletePrompt: `Delete ${displayName(department)} and all its members? This cannot be undone.`,
            onDelete: () => {
                closeModal();
                setStatus('Department deleted.', 'success');
            }
        });
        list.append(item);
        summary.append(list);
    } else {
        summary.append(makeElement('p', '', displayName(department)));
    }
    elements.modalBody.append(summary);

    const memberSection = makeElement('section', 'modal-section');
    appendMemberList(memberSection, department);
    elements.modalBody.append(memberSection);

    if (!isAdmin) return;

    const managerSection = makeElement('section', 'modal-section');
    managerSection.append(makeElement('h3', '', 'Manager name'));
    const managerField = makeFormField('Manager', 'manager_name', {
        value: department.manager_name || '',
        required: false
    });
    managerSection.append(managerField);
    const saveManagerButton = makeElement('button', 'primary-button', 'Save manager');
    saveManagerButton.type = 'button';
    managerSection.append(saveManagerButton);
    const managerMessage = addMessage(managerSection, '');
    saveManagerButton.addEventListener('click', async () => {
        const managerName = managerField.querySelector('input').value.trim();
        if (!managerName) {
            managerMessage.textContent = 'Enter a manager name before saving.';
            managerMessage.dataset.kind = 'error';
            return;
        }
        saveManagerButton.disabled = true;
        managerMessage.textContent = 'Saving…';
        try {
            const { error } = await supabase.rpc('set_department_manager', {
                p_department_id: department.id,
                p_manager_name: managerName
            });
            if (error) throw error;
            await loadData();
            openDepartment(department.id);
            setStatus('Manager details saved.', 'success');
        } catch (error) {
            managerMessage.textContent = `Could not save manager: ${error.message}`;
            managerMessage.dataset.kind = 'error';
        } finally {
            saveManagerButton.disabled = false;
        }
    });
    elements.modalBody.append(managerSection);

    const addMemberForm = makeElement('form', 'modal-form');
    addMemberForm.append(makeElement('h3', '', 'Add department member'));
    addMemberForm.append(makeFormField('Member name', 'name'));
    addMemberForm.append(makeFormField('Role / position', 'role', { required: false }));
    const addMemberButton = makeElement('button', 'primary-button', 'Add member');
    addMemberButton.type = 'submit';
    addMemberForm.append(addMemberButton);
    const memberMessage = addMessage(addMemberForm, '');
    addMemberForm.addEventListener('submit', async event => {
        event.preventDefault();
        addMemberButton.disabled = true;
        try {
            const formData = new FormData(addMemberForm);
            const { error } = await supabase.from('department_members').insert({
                department_id: department.id,
                name: String(formData.get('name')).trim(),
                role: String(formData.get('role')).trim()
            });
            if (error) throw error;
            await loadData();
            openDepartment(department.id);
            setStatus('Department member added.', 'success');
        } catch (error) {
            memberMessage.textContent = `Could not add member: ${error.message}`;
            memberMessage.dataset.kind = 'error';
        } finally {
            addMemberButton.disabled = false;
        }
    });
    elements.modalBody.append(addMemberForm);
}

function openStaffDirectory() {
    openModal('All staff');
    const section = makeElement('section', 'modal-section');
    section.append(makeElement('h3', '', `Current staff (${staff.length})`));
    if (staff.length === 0) {
        section.append(makeElement('p', 'modal-message', 'No staff members have been added yet.'));
    } else {
        const list = makeElement('ul', 'member-list');
        [...staff]
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(person => {
                const item = makeElement('li');
                if (isAdmin) {
                    renderManageableName(item, person, 'staff', openStaffDirectory);
                } else {
                    item.append(makeElement('strong', '', person.name));
                    if (person.role) item.append(document.createTextNode(` — ${person.role}`));
                }
                list.append(item);
            });
        section.append(list);
    }
    elements.modalBody.append(section);

    if (!isAdmin) return;
    const form = makeElement('form', 'modal-form');
    form.append(makeElement('h3', '', 'Add staff member'));
    form.append(makeFormField('Staff name', 'name'));
    form.append(makeFormField('Role / position', 'role'));
    const submit = makeElement('button', 'primary-button', 'Add staff');
    submit.type = 'submit';
    form.append(submit);
    const message = addMessage(form, '');
    form.addEventListener('submit', async event => {
        event.preventDefault();
        submit.disabled = true;
        try {
            const formData = new FormData(form);
            const { error } = await supabase.from('staff').insert({
                name: String(formData.get('name')).trim(),
                role: String(formData.get('role')).trim()
            });
            if (error) throw error;
            await loadData();
            openStaffDirectory();
            setStatus('Staff member added.', 'success');
        } catch (error) {
            message.textContent = `Could not add staff member: ${error.message}`;
            message.dataset.kind = 'error';
        } finally {
            submit.disabled = false;
        }
    });
    elements.modalBody.append(form);
}

async function loadData() {
    const [departmentResult, staffResult, memberResult] = await Promise.all([
        supabase.from('departments').select('id,name,manager_name,position_type,sort_order'),
        supabase.from('staff').select('id,name,role'),
        supabase.from('department_members').select('id,department_id,name,role')
    ]);
    const failedResult = [departmentResult, staffResult, memberResult].find(result => result.error);
    if (failedResult) throw failedResult.error;

    departments = departmentResult.data || [];
    staff = staffResult.data || [];
    members = memberResult.data || [];
    renderChart();
    renderSearchResults();
}

async function refreshSession(session) {
    currentSession = session;
    isAdmin = false;
    if (session) {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) throw error;
        isAdmin = data === true;
    }

    elements.loginForm.hidden = Boolean(session);
    elements.departmentForm.hidden = !isAdmin;
    elements.adminDepartmentManagement.hidden = !isAdmin;
    elements.signOutButton.hidden = !session;
    elements.adminToggleButton.textContent = isAdmin ? 'Admin tools' : 'Admin sign in';
    elements.adminStatus.textContent = !session
        ? 'Sign in with an administrator account to edit the directory.'
        : isAdmin
            ? `Signed in as ${session.user.email}.`
            : `Signed in as ${session.user.email}, but this account has no administrator access.`;
    renderAdminDepartments();
}

elements.adminToggleButton.addEventListener('click', () => {
    elements.adminPanel.hidden = !elements.adminPanel.hidden;
    if (!elements.adminPanel.hidden && !currentSession) {
        elements.loginForm.hidden = false;
        elements.loginForm.querySelector('input').focus();
    }
});

elements.loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = elements.loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    elements.adminStatus.textContent = 'Sending a secure sign-in link…';
    try {
        const formData = new FormData(elements.loginForm);
        const email = String(formData.get('email')).trim();
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
                emailRedirectTo: `${window.location.origin}${window.location.pathname}`
            }
        });
        if (error) throw error;
        elements.adminStatus.textContent = `Check ${email}'s inbox and spam folder, then click the sign-in link. The directory will open with you signed in.`;
    } catch (error) {
        elements.adminStatus.textContent = `Could not send the sign-in link: ${error.message}`;
    } finally {
        submit.disabled = false;
    }
});

elements.signOutButton.addEventListener('click', async () => {
    elements.signOutButton.disabled = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        await refreshSession(null);
        setStatus('Signed out.', 'success');
        openStaffDirectoryIfVisible();
    } catch (error) {
        setStatus(`Could not sign out: ${error.message}`, 'error');
    } finally {
        elements.signOutButton.disabled = false;
    }
});

function openStaffDirectoryIfVisible() {
    if (!elements.infoModal.hidden && elements.modalTitle.textContent === 'All staff') {
        openStaffDirectory();
    }
}

elements.departmentForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = elements.departmentForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
        const formData = new FormData(elements.departmentForm);
        const { error } = await supabase.from('departments').insert({
            name: String(formData.get('name')).trim(),
            position_type: String(formData.get('position_type')),
            sort_order: departments.length
        });
        if (error) throw error;
        elements.departmentForm.reset();
        await loadData();
        setStatus('Department added to the chart.', 'success');
    } catch (error) {
        elements.adminStatus.textContent = `Could not add department: ${error.message}`;
    } finally {
        submit.disabled = false;
    }
});

elements.directorySearch.addEventListener('input', renderSearchResults);
elements.searchResults.addEventListener('click', event => {
    const button = event.target.closest('button[data-result-type]');
    if (!button) return;
    if (button.dataset.resultType === 'department') openDepartment(button.dataset.departmentId);
    else openStaffDirectory();
});

document.querySelector('.container').addEventListener('click', event => {
    const button = event.target.closest('button[data-department-id]');
    if (button) openDepartment(button.dataset.departmentId);
});
document.getElementById('allStaffButton').addEventListener('click', openStaffDirectory);
elements.closeModalButton.addEventListener('click', closeModal);
elements.infoModal.addEventListener('click', event => {
    if (event.target === elements.infoModal) closeModal();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !elements.infoModal.hidden) closeModal();
});

document.querySelectorAll('img[data-logo]').forEach(image => {
    if (image.complete) {
        removeDarkBackgroundFromLogo(image);
    } else {
        image.addEventListener('load', () => removeDarkBackgroundFromLogo(image), { once: true });
    }
});

async function initialize() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        elements.adminToggleButton.disabled = true;
        setStatus('The online directory is being set up. Chart and search results will appear after the data service is connected.');
        return;
    }

    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { flowType: 'implicit' }
        });
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        await refreshSession(data.session);
        if (isAdmin) elements.adminPanel.hidden = false;
        await loadData();
        if (isAdmin) await ensureRoyalTvDepartments();
        setStatus(
            isAdmin
                ? 'Administrator signed in. You can now edit the directory.'
                : 'Directory loaded. Search departments or staff above.',
            'success'
        );
    } catch (error) {
        setStatus(`Could not load the directory: ${error.message}`, 'error');
    }
}

initialize();
