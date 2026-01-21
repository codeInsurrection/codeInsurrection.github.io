class DashboardState {
	static #token = '';
	static #carousel = undefined;

	static set token(value) {
		DashboardState.#token = value;
	}
	static get token() {
		return DashboardState.#token;
	}
	static get user() {
		const jwt = JSON.parse(atob(DashboardState.#token?.split('.')?.[1]));
		return jwt?.Fullname ?? '';
	}
	static get id() {
		const jwt = JSON.parse(atob(DashboardState.#token?.split('.')?.[1]));
		return jwt?.Email ?? '';
	}
	static set carousel(value) {
		DashboardState.#carousel = value;
	}
	static get carousel() {
		return DashboardState.#carousel;
	}
	static get appConfig() {
		return fetch('config.json').then (c => {
			return c.json();
		});
	}


}

class DashboardHelper {
	/**
	 * Call API endpoint
	 * @param {'login', 'getUser', 'generateLicence', 'requestPasswordReset', 'resendWelcome', 'deleteUser', 'revokeLicence', 'checkLicence', 'test'} name What to call
	 * @param {object} options
	 * @returns {Promise<any|string|string>}
	 */
	static async ApiCall(name, options = {}) {
		const conf = await DashboardState.appConfig;
		const host = conf.host;

		const map = {
			test: {
				url: `https://${host}/api/dashboard/test-with-auth`,
				action: 'GET',
				data: undefined,
				auth: true,
				json: false
			},

			login: {
				url: `https://${host}/api/login`,
				action: 'POST',
				data: JSON.stringify(options),
				auth: false,
				json: true
			},
			getUser: {
				url: `https://${host}/api/dashboard/user/get`,
				action: 'GET',
				data: undefined,
				auth: true,
				json: true,
				queryString: options.queryString
			},
			deleteUser: {
				url: `https://${host}/api/dashboard/user/remove`,
				action: 'DELETE',
				data: JSON.stringify(options),
				auth: true,
				json: true
			},
			checkLicence: {
				url: `https://${host}/api/dashboard/licences/check`,
				action: 'GET',
				data: undefined,
				auth: true,
				json: true,
				queryString: options.queryString
			},
			generateLicence: {
				url: `https://${host}/api/dashboard/licences/generate`,
				action: 'POST',
				data: JSON.stringify(options),
				auth: true,
				json: true
			},
			revokeLicence: {
				url: `https://${host}/api/dashboard/licences/revoke`,
				action: 'DELETE',
				data: JSON.stringify(options),
				auth: true,
				json: true
			},
			requestPasswordReset: {
				url: `https://${host}/api/dashboard/user/request-password-reset`,
				action: 'POST',
				data: JSON.stringify(options),
				auth: true,
				json: true
			},
			resendWelcome: {
				url: `https://${host}/api/dashboard/user/resend-welcome`,
				action: 'POST',
				data: JSON.stringify(options),
				auth: true,
				json: true
			}
		}

		const endpoint = map[name];
		const endpointUrl = endpoint.queryString ? endpoint.url + `${endpoint.queryString}` : endpoint.url;

		try {
			const api = await fetch(new Request(endpointUrl, {
				headers: new Headers({
					'Accept': 'application/json',
					'X-CARDINAL': '',
					'Content-Type': 'application/json',
					'Accept-Encoding': 'gzip',
					'Authorization': endpoint.auth ? `Bearer ${DashboardState.token}` : null
				}),
				method: endpoint.action,
				body: endpoint.action === 'POST' ? endpoint.data : null
 			})).catch (e => {
				 console.info (e);
			});

			if (api && api.ok && api.status === 200) {
				return await endpoint.json ? api.json() : api.text();
			}

			return `A ${api.status} error occurred`;

		} catch (ex) {
			console.info (`An error occurred ${ex.message}`);
			return ex.message;
		}

	}
}

const clearDetails = () => {
	const d = document.querySelector('div.user-details');
	document.querySelectorAll('div.user-details > div > span').forEach(e => e.textContent = '');
	//if (d.style.display !== 'none') d.style.display = 'none';
}

const buildModal = (title, prompt, action) => {
	const dialog = document.querySelector('dialog');
	const dialogTitle = document.querySelector('#dialog-title');
	const dialogPrompt = document.querySelector('#dialog-prompt');

	if (!title || !action) return;

	dialogPrompt.textContent = prompt ?? '';
	dialogTitle.textContent = title;
	delete dialog.dataset.result;
	dialog.dataset.action = action;

	dialog.showModal();
}

const clearResults = () => {
	DashboardState.carousel?.destroy({completely: true});
	document.querySelectorAll('.splide__slide:not(#user-template)').forEach(e => {
		e?.remove();
	});
	DashboardState.carousel = undefined;

}

const getField = (fieldName) => {
	const selectedUser = document.querySelector('.splide__slide.is-active > .user-details');

	return selectedUser?.querySelector (`div#user-${fieldName} > span:nth-of-type(2)`).textContent ?? '';
}

const clearClipboard = () => {
	try {
		navigator.clipboard.writeText(undefined).then().catch();
	} catch{}
}

const logout = () => {
	const loggedInUser = document.querySelector('#user');
	DashboardState.token = '';
	clearResults();
	clearClipboard();
	document.querySelector('input#finduser').value = '';
	const fl = document.querySelector('input#checklicence');
	fl.value = '';
	fl.style.backgroundColor = '#FFFFFF';
	document.querySelector('button#copy-licences').style.visibility = 'hidden';
	loggedInUser.style.opacity = '0';
	Array.from(document.querySelector('div#container').children).forEach(e => e.classList.add('disabled'));
	delete loggedInUser.dataset.id;

	const portcullis = document.querySelector('#portcullis');
	const tph = document.querySelector('#top-panel').offsetHeight;
	portcullis.style.top = tph + 'px';
	portcullis.style.height = `calc(100% - ${tph}px`;

	document.querySelector('div#container').style.position = 'fixed';

	document.querySelectorAll('#licence-list > span').forEach(e => e.remove());

	const dialog = document.querySelector('dialog');
	dialog.dataset.result = 'timeout';
	dialog.close();

	document.querySelector('span#action-result').textContent = '';

	setTimeout(() => {
		loggedInUser.textContent = '';
		document.querySelector('input#username').focus();
	}, 750);
}

const getConfig = async () => {

}

document.addEventListener('DOMContentLoaded', async () => {
	const loginButton = document.querySelector('button#login');
	const usernameField = document.querySelector('input#username');
	const passwordField = document.querySelector('input#password');
	const userid = document.querySelector('#user');
	const dialog = document.querySelector('dialog');
	const actionResult = document.querySelector('span#action-result');
	const portcullis = document.querySelector('#portcullis');
	const container = document.querySelector('div#container');

	// setTimeout (() => {
	// 	portcullis.addEventListener('transitionend', () => {
	// 		portcullis.style.display = 'none';
	// 	}, {once: true});
	// }, 1750);

	const tph = document.querySelector('#top-panel').offsetHeight - 2;
	portcullis.style.top = tph + 'px';
	portcullis.style.height = `calc(100% - ${tph}px`;
	const config = await DashboardState.appConfig;
	console.info ('APP', config);
	document.querySelector('div#version').textContent = 'v' + config.version;
	container.style.top = tph + 'px';


	clearResults();
	usernameField.value = '';
	passwordField.value = '';

	loginButton.addEventListener('click', async (e) => {
		e.stopPropagation();

		if (e.target.textContent === 'Logout') {
			logout();
			e.target.textContent = 'Login';
			return;
		}

		const u = usernameField.value;
		const p = passwordField.value;
		if (u === '' || p === '') return;

		/* Take credentials and login */
		const r = await DashboardHelper.ApiCall('login', {
			"email": u,
			"password": p,
			"usePasswordHash": false,
			"issue": "token"
		}).catch(ex => {
			console.info (`Ex: ${ex}`);
		});

		DashboardState.token = r?.tokens?.authorisationToken ?? '';

		if (DashboardState.token.length) {
			document.querySelectorAll('div.disabled').forEach(e => e.classList.remove('disabled'));
			portcullis.style.top = window.innerHeight + tph + 'px';
			container.style.position = 'relative';

			e.target.textContent = 'Logout';
			userid.textContent = DashboardState.user;
			userid.dataset.id = DashboardState.id;
			userid.style.opacity = userid.textContent.length ? '1' : '0';

			setTimeout(() => {
				//logout();
				e.target.textContent = 'Login';
			}, 5 * 60 * 1000);
		}

		usernameField.value = '';
		passwordField.value = '';
		usernameField.focus();
	});

	document.querySelector('select#licence-feature').addEventListener('change', (e) => {
		/* If selecting an assessor feature licence then set type to assessor */
		const type = document.querySelector('select#licence-type');
		switch (e.target.value) {
			case 'Student':
				type.value = '3 year';
				break;

			case 'Assessor':
				type.value = 'Assessor';
				break;
		}
	});

	document.querySelector('select#licence-type').addEventListener('change', (e) => {
		/* If selecting an assessor type set feature to assessor */
		const feature = document.querySelector('select#licence-feature');

		switch (e.target.value) {
			case 'Assessor':
				feature.value = 'Assessor';
				break;

			case 'Testing':
			case 'Trial':
				feature.value = 'Standard';
				break;

			default:
				if (feature.value === 'Assessor') feature.value = 'Student';
		}
	});



	[
		{input: 'input#password', button: 'button#login'},
		{input: 'input#finduser', button: 'button#find-user-button'},
		{input:'input#checklicence', button:'button#check-licence-button'}
	].forEach (n => {
		document.querySelector(n.input).addEventListener('keypress', (ev) => {
			if (ev.keyCode === 13 || ev.key === 'Enter') {
				document.querySelector(n.button).click();
			}
		});
	});


	document.querySelectorAll('div.close').forEach(el => {
		el.addEventListener('click', (e) => {
			const pes = e.target.previousElementSibling;
			pes.value = '';

			switch (pes.id) {
				case 'checklicence':
					pes.style.backgroundColor = '';
					break;

				case 'finduser':
					//pes.dispatchEvent(new InputEvent('input'));
					break;
			}
			pes.focus();

		});
	});

	document.querySelector('#gen-licences').addEventListener('click', async () => {
		const licComment = document.querySelector('#licence-comment');
		const licCount = document.querySelector('#licence-count');
		const licFeature = document.querySelector('#licence-feature');
		const licType = document.querySelector('#licence-type');


		if (licComment.value === '' || licCount.value === 0) return;

		const data = {
			Licences: [
				{
					Type: licType.value,
					Feature: licFeature.value,
					Number: licCount.value,
					Comment: licComment.value + ` created by ${userid.textContent}`
				}
			]
		}

		const r = await DashboardHelper.ApiCall('generateLicence', data);
		if (r?.hasOwnProperty('published')) {
			const il = document.querySelector('div#licence-list');
			r.published.keys.forEach(k => {
				const q = document.createElement('SPAN');
				q.textContent = k;
				il.append(q);
			});

			document.querySelector('button#copy-licences').style.visibility = 'visible';
		}

	});

	document.querySelector('#copy-licences').addEventListener('click', async () => {
		/* Copy to clipboard */
		const writeToClipboard = async (text) => {
			try {
				await navigator.clipboard.writeText(text);
			} catch (error) {
				console.error(error.message);
			}
		}

		const licText = [];
		document.querySelectorAll('div#licence-list > span').forEach(l => {
			licText.push (l.textContent);
		});

		await writeToClipboard(licText.join('\n'));

	});

	document.querySelector('button#check-licence-button').addEventListener('click', async () => {
		const lk = document.querySelector('input#checklicence');
		if (!lk.value?.length) return;

		const r = await DashboardHelper.ApiCall('checkLicence', {queryString: `?licenceKey=${lk.value}`});

		lk.focus();
		lk.style.backgroundColor = r?.assigned ? '#47d547' : '#e85a5a';

		if (r?.assigned) {
			document.querySelector ('input#finduser').value = r.email;
			document.querySelector('button#find-user-button').click();
		}
	});

	/* User Management */
	document.querySelector('button#find-user-button').addEventListener('click', async () => {
		const u = document.querySelector('input#finduser').value;
		document.querySelectorAll('span.alert').forEach (e => e.classList.remove('alert'))

		if (u === '') return;
		let email = '';
		let ix = 0;

		const r = await DashboardHelper.ApiCall('getUser', {queryString: `?user=${u}`});

		if (r.length && Array.isArray(r)) {
			clearResults();

			const userDetailTemplate = document.querySelector('#user-template');
			r?.forEach(u => {
				const userDetail = userDetailTemplate.cloneNode(true);
				const id = '_' + Date.now() + ix.toString();
				userDetail.id = id;
				document.querySelector('.splide__list').appendChild(userDetail);

				const keys = Object.keys(u);
				keys.forEach(k => {
					const h = document.querySelector(`#${id} > .user-details > #user-${k}`);
					if (h) {
						h.querySelector('span:nth-of-type(1)').textContent = (k[0].toUpperCase() + k.substring(1)).split(/(?=[A-Z])/).join (' ');
						const val = h.querySelector('span:nth-of-type(2)');
						val.textContent = typeof u[k] === 'boolean' ? u[k] ? 'Yes' : 'No' : u[k];

						switch (k) {
							case 'appFeatureSet':
								val.classList.remove ('feature-set');
								if (+val.textContent > 0) val.classList.add('feature-set');
								break;

							case 'feature':
								val.classList.remove ('feature-student','feature-assessor', 'feature-standard');
								val.classList.add ('feature-' + val.textContent.toLowerCase());
								break;

							case 'registered':
							case 'enabled':
								if (val.textContent === 'No') val.classList.add('alert');
								break;

							case 'locked':
								if (val.textContent === 'Yes') val.classList.add('alert');
								break;

							case 'status':
								if (val.textContent === 'Invalid') val.classList.add('alert');
								break;

							case 'email':
								email = val.textContent;
								break;

							default:
								val.classList.remove('alert');

						}
					}
				});
				// const ud = userDetail.querySelector('.user-details');
				// ud.style.display = 'block';
				ix += 1;
			});

			document.querySelector('div#actions').style.display = document.querySelector('#user').dataset.id === email ? 'none' : 'flex';
			const c = new Splide( '.splide', {
				type   : 'loop',
				direction: 'ttb',
				wheel: true,
				releaseWheel: true,
				height: '520px',
				width: '775px',
				padding: {
					top: 0,
					bottom: 0
				}
			});

			DashboardState.carousel = c;
			DashboardState.carousel.mount();
		}
	});

	/* Resend Welcome */
	document.querySelector('button#user-action-user-resend').addEventListener('click', async () => {
		actionResult.textContent = '';

		const userDetail = {
			Email: getField('email'),
			UserId: getField('email'),
			Fullname: getField('fullname'),
			LicenceKey: getField('licenceKey'),
			Initials: getField('initials'),
		}

		const r = await DashboardHelper.ApiCall('resendWelcome', userDetail);
		actionResult.textContent = r;
		actionResult.style.color = r.includes('error') ? 'crimson' : 'forestgreen';
	});

	/* Request Password Reset */
	document.querySelector('button#user-action-user-prompt').addEventListener('click', async () => {
		actionResult.textContent = '';
		const r = await DashboardHelper.ApiCall('requestPasswordReset', {userEmail: getField('email')});
		actionResult.textContent = r;
		actionResult.style.color = r.includes('error') ? 'crimson' : 'forestgreen';
	});

	/* Revoke Licence */
	document.querySelector('button#user-action-licence-revoke').addEventListener('click', () => {
		//buildModal('Revoke Licence', 'Revoking a licence will return the licence to the pool of un-registered licences. This will affect the user in a way that they will not be able to remedy themselves, leaving them with an account but no licence. Only use this option if you really understand why you are doing it.', 'licence-revoke');
	});

	/* Remove User */
	document.querySelector('button#user-action-user-delete').addEventListener('click', () => {
		buildModal('Delete User', 'Deleting a user will remove them from our records. They will loose their ability to login. This is a useful step to take to force a user to setup from scratch or if the email they first registered with was not the one they intended. They should register as a new user using the original licence.', 'user-delete');
	});

	document.querySelector('dialog button#confirm').addEventListener('click', () => {
		dialog.dataset.result = 'confirm';
		dialog.close();
	});

	document.querySelector('dialog button#cancel').addEventListener('click', () => {
		dialog.dataset.result = 'cancel';
		dialog.close();
	});

	document.querySelector('dialog').addEventListener('close', () => {
		if (dialog.dataset.result !== 'confirm') return;

		switch (dialog.dataset.action) {
			case 'user-delete':
				break;


		}
	});

	document.querySelector('#clear-results').addEventListener('click', () => {
		clearResults();
	});

});