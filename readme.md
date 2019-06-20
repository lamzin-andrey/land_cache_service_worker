# LandCacheServiceWorker

## About
It caching like to standart browser behavior.
It release the strategy "If resource exists in cache, get it from cache, else get it from server. After pause  will  update resource in cache".

Service worker and class extends LandCacheClient caching all content on all pages your site.

Every request first serach in cache, if it not found in cache, service worker send request to the server.
After 1 seconds servicve worker in background mode refresh cache data.

You can extends class LandCacheClient for customize or disable "alert" about updates on page.
(Override method showUpdateMessage)

You can extends class LandCacheClient for customize or disable "alert" about first time caching all page resources.
It alert helpfull for progressive web applications, but for site, like as blog it not need.
(Override method showFirstCachingCompleteMessage)

## Installation

1 Place script landcachersw.js in the root directory your site.
It must be available for link https://yoursite.com/landcachersw.js, it important!

2 Add in begin html code all pages your site code:
  <script src="/js/landcacherswinstaller.js"></script>
You can copy it script code as inline, it provide best work cacher.

3 Create javascript class, extends LandCacheClient (like as class defined in concrete_cache_client_example.js)

4 Use webpack or gulp or "simply babel" for compile land_cache_client.js and  your_concrete_cache_client.js and add it 
in your result bundle. 

5 In start point your js app add initalization CacheClient like as 

  let cacheClient = new YourCacheClient();
  
(If you do not want use messages about updates and first caching in your site, you can use ConcreteCacheClientExample as YourConcreteCacheClient)



# Ru
Это кеширование похоже на стандартное поведение браузера. Реализация стратегии
«Если ресурс существует в кеше, извлечь из кеша, иначе получить с сервера.
После паузы ресурс обновится в кеше».
ServiceWorker и класс, наследующийся от LandCacheClient кэширует весь контент на всех страницах вашего сайта.
При каждом запросе сначала выполняется поиск в кеше, если он не найден в кеше, 
ServiceWorker отправляет запрос на сервер.
Через 1 секунду ServiceWorker в фоновом режиме обновляет данные кеша.

Вы можете расширить класс LandCacheClient для настройки или отключения оповещения об обновлениях на странице.
(Переопределить метод showUpdateMessage)

Вы можете расширить класс LandCacheClient для настройки или отключения «оповещения» о первом кэшировании
всех ресурсов страницы.
Он полезен для прогрессивных веб-приложений, но для сайта, вроде блога, он не нужен.
(Метод переопределения showFirstCachingCompleteMessage)

Установка.

1 Поместите скрипт landcachersw.js в корневой каталог вашего сайта.
Он должен быть доступен по ссылке https://yoursite.com/landcachersw.js, это важно!

2 Добавьте в начало HTML-код всех страниц кода вашего сайта:
<script src = "/js/landcacherswinstaller.js"></script>

Вы можете скопировать код скрипта как встроенный, это обеспечит лучшую работу кэширования.


3 Создайте класс javascript, наследующийся от LandCacheClient 
(пример вы можете видеть в классе, определенном в concrete_cache_client_example.js)


4 Используйте webpack или gulp или «просто babel» для компиляции 
land_cache_client.js и your_concrete_cache_client.js 
и добавьте его в свой bundle.js или output.js.


5 В начальной точке вашего js-приложения добавьте инициализацию LandCacheClient как


let cacheClient = new YourCacheClient ();

(Если вы не хотите использовать сообщения об обновлениях и первом кэшировании на вашем сайте, 
вы можете использовать ConcreteCacheClientExample в качестве YourConcreteCacheClient).


