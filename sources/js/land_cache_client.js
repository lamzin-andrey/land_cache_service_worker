import $  from 'jquery';
/**
 * @class Главное назначение этого класса в том, чтобы взаимодействовать с serviceWorker-ом (sw) кэширующим ресурсы.
 * Это часть модуля LandCacheServiceWorker
 * Особенность модуля в том, что он не использует статический перечень arg в коде service worker cache.addAll(arg).
 * Экземпляр класса слушает сообщения от service worker
 * Когда sw активирован, собирает url всех ресурсов на странице,
 * полученных с того же домена что и загруженная страница. 
 * и передаёт их post сообщением в serviceWorker
 * 
 * Также он принимает сообщения о том, что тот или иной ресурс, кэшированный service worker изменён.
 * Если этот ресурс находится на открытой в браузере странице, выводится сообщение об этом.
 * Вид и прочие особенности сообщения можно перегрузить, создав класс, наследующийся от LandCacheClient
 * и перегрузив метод showUpdateMessage.
 * 
 * Необходимо вместе с этим скриптом также подключить скрипт регистрации serviceWorker swinstall, 
 * который после успешной регистрации создает ссылку на объект воркера window.cacheWorker
**/
class LandCacheClient {
	constructor () {
		this.init();
	}
	/**
	 * @description Необходимо вызвать по событию DOMContentLoaded
	*/
	init() {
		let o = this;
		o.verbose = false;
		//Заполняется url которые есть на странице и указывают на данный сайт. Заполнение происходит в getAllResources
		o._aUrlMap = {};
		navigator.serviceWorker.addEventListener('message', info => {
			o.onMessage(info);
		});
	}
	/**
	 * @description Проверит, не пусто ли _aUrlMap если пуста, вызовет getAllResources
	 * @return Object this._aUrlMap
	*/
	getAllResourcesHash() {
		let i, n = 0, o = this;
		for (i in o._aUrlMap) {
			n++;
			break;
		}
		if (!n) {
			o.getAllResources();
		}
		return o._aUrlMap;
	}
	/**
	 * @description Собирает на странице список всех ресурсов загруженных с данного домена
	 * @return array
	*/
	getAllResources() {
		let s = window.location.href, baseLink = s.split('?')[0],
			aImg = [], aStyles = [], aScripts = [], aMusic = [], aVideo = [], aSources = [],
			//aResources - результирующий массив с ресурсами
			aResources = [],
			nSzImg, nSzStyles, nSzScripts, nSzMusic, nSzVideo, nSzSources,
			i, sHost, c, src, o = this;
		o._aUrlMap = {};
		aImg = $('img');
		aStyles = $('link[rel=stylesheet]');
		aScripts = $('script');
		aMusic = $('audio');
		aVideo = $('video');
		aSources = $('source');
		
		aResources.push(s);
		o._aUrlMap[s] = 1;
		if (s != baseLink) {
			aResources.push(baseLink);
			o._aUrlMap[baseLink] = 1;
		}
		
		nSzImg = aImg.length;
		nSzStyles = aStyles.length;
		nSzScripts = aScripts.length;
		nSzMusic = aMusic.length;
		nSzVideo = aVideo.length;
		nSzSources = aSources.length;
		
		nSzImg = Math.max(nSzImg, nSzStyles, nSzScripts, nSzMusic, nSzVideo);
		
		sHost = s.split('/')[2];
		if (o.verbose) console.log('detected host', sHost);
		//Насчет sources (а также video и music) погорячился, если оно большое, то 206 ошибка.
		//А если хоть один из запросов, в массиве который передаётся addAll получит не 200  - ни один не будет добавлен в кэш
		for (i = 0; i < nSzImg; i++) {
			//images
			o._addResource(aResources, aImg[i], 'src', sHost);
			//styles
			o._addResource(aResources, aStyles[i], 'href', sHost);
			//scripts
			o._addResource(aResources, aScripts[i], 'src', sHost);
			//music
			//o._addResource(aResources, aMusic[i], 'src', sHost);
			//video
			//o._addResource(aResources, aVideo[i], 'src', sHost);
			//source
			//o._addResource(aResources, aSources[i], 'src', sHost);
		}
		if (o.verbose)  console.log('cacheclient create res list', aResources);
		//aResources.push('https://andryuxa.ru/404.php');
		return aResources;
	}
		

	/**
	 * @description Если в объекте oItem существует непустой атрибут с именем sAttrName и его значение указывает на хост sHost, добавляет его в aResources
	 * @param {Array} aResources
	 * @param {HtmlElement} oItem
	 * @param {String} sAttrName
	 * @param {String} sHost
	*/
	_addResource (aResources, oItem, sAttrName, sHost) {
		let co, src, o = this;
		if (o._aUrlMap[src]) {
			return;
		}
		if (oItem) {
			co = $(oItem);
			src = String(co.attr(sAttrName) ).trim();
			if (o._isOurHost(src, sHost)) {
				if (src.charAt(0) == '/') {
					src = 'https://' + sHost + src;
				}
				aResources.push(src);
				o._aUrlMap[src] = 1;
			}
		}
	}
	/**
	 * @description Вернет true если значение src содержит тот же хост, что и sHost или начинается с /
	 * @param {String} src
	 * @param {String} sHost
	 * @return Boolean
	*/
	_isOurHost(src, sHost) {
		if (!src) {
			return false;
		}
		if (src.charAt(0) == '/') {
			return true;
		}
		var srcHost = src.split('/')[2];
		if (srcHost == sHost || ('www.' + srcHost) == sHost) {
			return true;
		}
		return false;
	}
	/**
	 * @description Обработка сообщения от ServiceWorker
	 * @return array
	*/ 
	onMessage(info) { 
		var o = this;
		if (o.verbose) console.log('LandCacheClient OnMessage:', info);
		
		if (info.data.type == 'isFirstRun') {
			if (o.verbose) console.log('LandCacheClient OnMessage: got event FirstRun! ');
			if (window.landCacheWorker) {
				window.landCacheWorker.postMessage(o.getAllResources());
			}
		}
		if (info.data.type == 'hasUpdate') {
			var sUpdUrl = info.data.updUrl,
				oHashResources = o.getAllResourcesHash();
			if (!o.updateMessageIsShowed && oHashResources[info.data.updUrl]) {
				//Чтобы не показывать сообщение 10 раз если обновлены все 10 картинок на странице
				o.updateMessageIsShowed = true;
				o.showUpdateMessage();
			}
		}
		if (info.data.type == 'firstRunResourcesComplete' && info.data.updUrl == location.href) {
			o.showFirstCachingCompleteMessage();
		}
	}
	/**
	 * @description Override it Вот это можно перегрузить в наследнике. 
	*/ 
	showUpdateMessage() {
		alert('New version this page available!');
	}
	/**
	 * @description Сообщение о том, что все ресурсы закэшированы (вызывается при первом входе на страницу после кэширования, полезно для pwa)
	 * For progressive web
	*/
	showFirstCachingCompleteMessage() {
		alert('All resources loaded, add us page on main screen and use it offline.');
	}
}

export default LandCacheClient;