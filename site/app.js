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
    const button = makeElement('button', `chart-card ${className}`);
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
        elements.leadership.append(departmentButton(department, ''));
    });

    ordered
        .filter(department =>
            ['core', 'sub'].includes(department.position_type) &&
            !['PROGRAMS MANAGER', 'MARKETING MANAGER'].includes(department.name)
        )
        .forEach(department => {
            elements.mainDepartments.append(departmentButton(department, 'main-card'));
        });

    ordered
        .filter(department =>
            department.position_type === 'tv_left' && department.name !== 'MARKETING MANAGER'
        )
        .forEach(department => {
            elements.tvLeft.append(departmentButton(department, 'branch-card'));
        });

    ordered
        .filter(department => department.position_type === 'tv_right')
        .forEach(department => {
            elements.tvRight.append(departmentButton(department, 'branch-card'));
        });

    ordered
        .filter(department => department.position_type === 'ask_institute')
        .forEach(department => {
            elements.askDepartments.append(departmentButton(department, 'branch-card'));
        });

    elements.emptyChartMessage.hidden = departments.length > 0;
}

function renderSearchResults() {
    const term = elements.directorySearch.value.trim().toLocaleLowerCase();
    elements.searchResults.replaceChildren();
    elements.searchResults.hidden = term.length === 0;
    if (!term) return;

    const results = [];
    departments.forEach(department => {
        if (`${department.name} ${department.manager_name}`.toLocaleLowerCase().includes(term)) {
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
        list.append(item);
    });
    container.append(list);
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
    summary.append(makeElement('p', '', displayName(department)));
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
                item.append(makeElement('strong', '', person.name));
                if (person.role) item.append(document.createTextNode(` — ${person.role}`));
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
    elements.signOutButton.hidden = !session;
    elements.adminToggleButton.textContent = isAdmin ? 'Admin tools' : 'Admin sign in';
    elements.adminStatus.textContent = !session
        ? 'Sign in with an administrator account to edit the directory.'
        : isAdmin
            ? `Signed in as ${session.user.email}.`
            : `Signed in as ${session.user.email}, but this account has no administrator access.`;
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
    elements.adminStatus.textContent = 'Signing in…';
    try {
        const formData = new FormData(elements.loginForm);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: String(formData.get('email')).trim(),
            password: String(formData.get('password'))
        });
        if (error) throw error;
        await refreshSession(data.session);
        elements.loginForm.reset();
        if (isAdmin) setStatus('Administrator signed in.', 'success');
        else setStatus('Signed in, but this account is not authorized to edit the directory.', 'error');
        await loadData();
    } catch (error) {
        elements.adminStatus.textContent = `Sign-in failed: ${error.message}`;
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

document.querySelector('.chart').addEventListener('click', event => {
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

async function initialize() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setStatus('Connect a Supabase project in site/supabase-config.js to load the live directory. See HOSTING.md for setup.', 'error');
        return;
    }

    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        await refreshSession(data.session);
        await loadData();
        setStatus('Directory loaded. Search departments or staff above.', 'success');
    } catch (error) {
        setStatus(`Could not load the directory: ${error.message}`, 'error');
    }
}

initialize();
