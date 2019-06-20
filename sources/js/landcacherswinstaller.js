// Check browser support Service Worker API.
if (navigator.serviceWorker) {
    //All registration code is acync
    navigator.serviceWorker.register('/landcachersw.js')
      .then(() => navigator.serviceWorker.ready.then((worker) => {
		if (worker.sync) {
			//console.log('Before register syncdata');
			worker.sync.register('syncdata');
		} 
		window.landCacheWorker  = worker.active;
      }))
      .catch((err) => console.log(err));
}



