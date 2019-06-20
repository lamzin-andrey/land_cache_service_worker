// "Имя" нашего кэша
const CACHE = "if-cache-else-network->update-cache";
//То есть сначала ищем всё в кэше, если там нет в сети, а потом обновляем кэш


/**
 * @description Подписываемся на событиие активации
*/
self.addEventListener('activate', onActivate);

/**
 * @description Подписываемся на событиие отправки браузером запроса к серверу
*/
self.addEventListener('fetch', onFetch);

/**
 * В общем-то нам это пока не надо.
*/
self.addEventListener('install', onInstall);

/**
 * Будем получать в onPostMessage список ресурсов, которые надо кэшировать при первом посещении страницы
*/
self.addEventListener('message', onPostMessage); 

/**
 * Примет 1 в случае, если происходит добавление в кэш при первом входе на страницу
*/
self.isFirstRunMode = 0;

/**
 * Примет значение url страницы в случае, если происходит добавление в кэш при первом входе на страницу
*/
self.firstRunPageUrl = '';

/**
 * Примет значение последнего url из списка в случае, если происходит добавление последнего переданного ресурса в кэш при первом входе на страницу
*/
self.lastResourceUrl = '';

/**
 * Примет 1 в случае, если начато добавление последнего в списке переданных ресурсов  при первом входе на страницу
*/
self.isLastResource = 0;

/**
 * @description Здесь будем хранить url которые не надо искать в кэше (это бывает нужно, когда в кэше уже искали, но его там нет)
 * То есть, сюда помещаем те url, которые не надо искать в кэше
*/
self.excludeUrlList = {};

/**
 * @description Здесь будем хранить last-modified каждого найденного в кэше url
 * Чтобы иметь возможность вывести уведомление типа "контент изменился"
*/
self.lastModUrlList = {};


/**
 * @description Здесь будем хранить длину контента страниц, не имеющих last-modified для каждого найденного в кэше url
 * Чтобы иметь возможность вывести уведомление типа "контент изменился"
*/
self.contentLengthUrlList = {};

self.verbose = false;


/**
 * @description Перехватываем запрос
*/
function onFetch(event) {
	//Если его не нашли в кэше, значит надо отправить запрос на сервер, то есть кормить собак и ничего не трогать
	if (self.excludeUrlList[event.request.url]) {
		if (self.verbose) console.log('Skip search in cache ' + event.request.url);
		return;
	}
	//Обратимся за ответом на запрос в кэш, а если него там нет, то на сервер
	event.respondWith(getResponseFromCacheOrNetwork(event.request) );
	
	//Чтобы не DDOS-ить сервер одинаковыми запросами с малым промежутком, сделаем секундную паузу перед тем как обновить данные в кэше
	//Клонируем запрос, потому что его на момент вызова лямбды может и не существовать
	let req = event.request.clone();
	setTimeout(() => {
		//Откроем кэш и вызовем нашу функцию update
		caches.open(CACHE).then((cache) => {
			if (self.verbose)  console.log('Schedule update  ' + req.url);
			update(cache, req, true);
		});
	}, 1000);
}
/**
 * @description Обратимся за ответом на запрос в кэш, а если него там нет, то на сервер
 * @param {Request} request
 */
function getResponseFromCacheOrNetwork(request) {
	return caches.open(CACHE).then((cache) => { return onOpenCacheForSearchRequest(cache, request); });
}
/**
 * @description Обработка события "Когда кэш открыт для поиска результата"
 * @param {Cache} cache Объект открытого кэша
 * @param {Request} request запрос, который будем искать
 */
function onOpenCacheForSearchRequest(cache, request) {
			//Ищем
	if (self.verbose) console.log('Will search in cache ' + request.url);
	return cache.match(request)
			//Если найдено, проверим что нашли и вернем только хороший результат из onFoundResInCache
		.then(onFoundResInCache)
			//Если не найдено или найдено не то, запросим методом update и вернем результат, который вернет update
		.catch(() => { 
			if (self.verbose) console.log('No match, will run update');
			return update(cache, request); 
		});
}
/**
 * @description Запрос данных с сервера. Этот метод вызывать в onOpenCache... , когда доступен объект открытого кэша cache
 * @param {Cache} cache - кеш, в котором ищем, на момент вызова должен уже быть открыт
 * @param {Request} request
 * @param {Boolean} isUpdateCacheAction true когда обновление происходит не потому,что в кэше не найдено, а потому, что это обновление данных в кэше, хотя они там есть
 * @return Promise -> HttpResponse данные с сервера
*/
function update(cache, request, isUpdateCacheAction) {
	if (self.verbose) console.log('Call update 2 ' + request.url);
	//Помечаем, что в onFetch не надо лезть в кэш за данным запросом
	self.excludeUrlList[request.url] = 1;
	//Собственно, запрос
	return fetch(request)
	//когда пришли данные
	.then((response) => {
		if (self.verbose) console.log('Got response ');
		//если статус ответа 200, сохраним ответ в кэше
		if (response.status == 200) {
			cache.put(request, response.clone() );
			//Уведомим страницу, что на ней есть новые данные (если они есть)
			if (isUpdateCacheAction) {
				if (self.verbose) console.log('Will try send message about upd');
				checkResponseForUpdate(response);
			}
			//Проверим, не загружены ли все ресурсы при первом входе на страницу и в случае успеха отправим сообщение клиентам
			checkFirstRunAllResourcesLoaded(response.url);
			//Помечаем, что эти данные уже есть в кэше
			self.excludeUrlList[request.url] = 0;
		}
		//вернем ответ сервера
		return response;
	})
	//Сервер не ответил, например связь оборавалсь
	.catch((err) => {
		//Если с сервера ничего полезного не пришло, а в кэше у нас тоже ничео нет, всё печально, но тут уже ничего не поделать
		// а если в кэше есть, то всё отлично, пусть при следующем входе на страницу пользователь пока смотрит на то, что в кеше
		//Помечаем, что эти данные  есть в кэше 
		self.excludeUrlList[request.url] = 0;
	}); 
} 
/**
 * @description Уведомим страницу, что на ней есть новые данные (если они есть)
 * @param {Response} result
 */
function checkResponseForUpdate(response) {
	if (response.status == 200 && response.url) {
		if (self.verbose) console.log('checkResponseForUpdate: first if ok, url = ' + response.url);
		
		//Ищем по last-modified
		if (self.lastModUrlList[response.url] && response.headers && response.headers.has('last-modified')) {
			if (self.verbose) console.log('checkResponseForUpdate: second if ok, url = ' + response.url);
			if (self.lastModUrlList[response.url] != response.headers.get('last-modified')) {
				if (self.verbose) console.log('Send msg hashUpdate becouse in cache "' + self.lastModUrlList[response.url] + '", but from server got "' + response.headers.get('last-modified') + '"');
				sendMessageAllClients('hasUpdate', response.url);
			} else {
				if (self.verbose) {
					console.log("self.lastModUrlList[response.url]  == response.headers.get('last-modified') , url = " + response.url);
				}
			}
		}
		
		//Ищем по изменению длины контента
		if (self.contentLengthUrlList[response.url]) {
			if (self.verbose) console.log('checkResponseForUpdate: found "' + response.url + '" in self.contentLengthUrlList');
			response.clone().text().then((str) => {
				if (self.contentLengthUrlList[response.url] != str.length) {
					if (self.verbose) console.log('will send hasUpdate');
					sendMessageAllClients('hasUpdate', response.url);
				}
				if (self.verbose) console.log('checkResponseForUpdate: new content length = "' + str.length + '"');
				if (self.verbose) console.log('checkResponseForUpdate: safe length = "' + self.contentLengthUrlList[response.url] + '"');
			});
		}
		
	}
}
/**
 * @description Вызывается в update. Если это загрузка ресурсов в кэш при первом входе на страницу и все они загружены успешно, отправит клиентам сообщение
 * @param {String } sUrl
 */
function checkFirstRunAllResourcesLoaded(sUrl) {
	if (self.isFirstRunMode) {
		if (self.isLastResource && sUrl == self.lastResourceUrl) {
			self.isFirstRunMode = 0;
			self.isLastResource = 0;
			self.lastResourceUrl = '';
			sendMessageAllClients('firstRunResourcesComplete', self.firstRunPageUrl);
		}
	}
}
/**
 * @description Обработка события "Найдено в кэше"
 * @param {Response} result
 */
function onFoundResInCache(result) {
	if (self.verbose) console.log('found in cache!3..', result + ', result.url = ' + (result.url ? result.url : 'undefined') );
	//если не найдено, вернем Promise.reject - благодаря этому в onOpenCacheForSearchRequest вызовется catch
	if (!result || String(result) == 'undefined') {
		if (self.verbose) console.log('will return no-match Promise');
		return Promise.reject('no-match');
	}
	//Сохраним данные из заголовков о ресурсе, которые помогут нам определить, изменился ли ресурс
	saveResultHeadersData(result);
	if (self.verbose) console.log('will return result OR no-match Promise');/**/
	//Если не нужны уведомления вида "Есть новый еконтент на странице" вобщем-то можно сократить до этой строчки, как и было у автора
	return (result || Promise.reject('no-match'));
}
/**
 * @description Сохраним время последней модификации ресурса, а если это невозможно, его размер.
 * Данная функция вызывается из onFoundResInCache
 * @param {Response} result - найденный в кэше ответ на запрос
 */
function saveResultHeadersData(result) {
	if (result.headers && result.url) {
		let sContentType = result.headers.has('content-type') ? result.headers.get('content-type') : '';
		//Выводим сообщения только в том случае, если обновились текст или картинки
		if (sContentType.indexOf('text/html') != -1 
			|| sContentType.indexOf('image/') != -1
			//|| sContentType.indexOf('application/json') != -1
			) {
				//если сервер передал время последнего изменения ресурса, нам повезло, можно не мудрить
				if (result.headers.has('last-modified')) {
					if (self.verbose) console.log('Will save lastmtime "' + result.headers.get('last-modified') + '"');
					//Просто запомним, что у нас в кэше лежит ресурс, изменённый тогда-то
					self.lastModUrlList[result.url] = result.headers.get('last-modified');
				} else {
					//если сервер не передал время последнего изменения ресурса, будем мудрить
					if (self.verbose) console.log('has no lastmtime for url "' + result.url + '"');
					//если нет такого заголовка сохраняем длину контента
					//Так здесь text() возвращает Promise, пришлось клонировать, иначе была ошибка искажения содержимого
					result.clone().text().then((str) => {
						if (self.verbose) console.log('Will save length "' + str.length + '" for "' + result.url + '"');
						//Просто запомним длину контента
						self.contentLengthUrlList[result.url] = str.length;
					});
				}
		}
	}
}
/**
 * @description Обработка события активации
 */
function onActivate(){
	//Сообщим всем клиентам (клиенты - это например открытые вкладки с разными страницами вашего сайта в браузере)
	// сообщим, что мы тут и работаем.
	if (self.verbose) console.log('Activation event!');
	self.clients.claim();
	
	//Если это первый запуск, надо сообщить страницам, чтобы прислали списки url которые надо кэшировать
	setTimeout(() => {
		if (self.verbose) console.log('Worker: send First Run!');
		sendMessageAllClients('isFirstRun');
	}, 1000);
}
/**
 * @description Обработка события установки воркера. 
*/
function onInstall(){
	if (self.verbose) console.log('Installation event!');
}

//Это всё.
//Далее просто для информации, чтобы проще было связыватсья с браузером при необходимости

/**
 * @description Удобная отправка сообщений клиентам (Кто такие клиенты см. onActivate)
 * @param {String} sType
 * @param {String} sUpdUrl используется для сообщения hasUpdate чтобы клиент мог проверить, есть ли ресурс с таким url на странице и если есть, обновить
*/
function sendMessageAllClients(sType, sUpdUrl) { 
	self.clients.matchAll().then((clients) => {
		clients.forEach((client) => {
			if (self.verbose) console.log('founded client: ', client);
			let message = {
				type:  sType,
				resources : self.cachingResources,
				updUrl:sUpdUrl,
				clientUrl:client.url
			};
			// Уведомляем клиент об обновлении данных.
			client.postMessage(message);
		});
	});
}
/**
 * @description Приём сообщений от клиента (Кто такие клиенты см. onActivate)
 * @param {Object} {data, origin} info
*/
function onPostMessage(info) {
	//Кэшируем переданные ресурсы
	caches.open(CACHE).then((cache) => {
		self.isFirstRunMode = 1;//Чтобы в update было можно понять, что происходит первое кэширование (чтобы иметь возможность сообщить об его успехе)
		self.firstRunPageUrl = info.data[0];
		for (let i = 0; i < info.data.length; i++) {
			if (self.verbose) console.log('First run caching resource ' + info.data[i]);

			if (i == info.data.length - 1) {
				self.isLastResource = 1;
				self.lastResourceUrl = info.data[i];
			}
			update(cache, info.data[i]);
		}
	});
}
