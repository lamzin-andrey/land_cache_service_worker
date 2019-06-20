import  LandCacheClient from './land_cache_client';
/***
 * Example customize client functions
 * Пример кастомизации функций клиента кэша
 */
class ConcreteCacheClientExample extends LandCacheClient {
        /**
         * @description 
        */ 
        showUpdateMessage() {
                //I do not show message about updates
                //alert('New version this page available!');
                //I want show nice bootstrap modal message
                //$('#myModalBody').text('New version this page available!');
                //$('#myModal').modal('show');
        }

        /**
	 * @description Off show message "Page caching complete".
         * Отключение сообщения "Кэширование завершено"
	*/
	showFirstCachingCompleteMessage() {
	        //alert('All resources loaded, add us page on main screen and use it offline.');
	}
}

export default ConcreteCacheClientExample;