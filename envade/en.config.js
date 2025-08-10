(() => { // webpackBootstrap
self.__envade$config = {
    prefix: '/ev/',
    files: {
        config: '/envade/en.config.js',
        bundle: '/envade/en.bundle.js',
        client: '/envade/en.client.js',
        worker: '/envade/en.worker.js'
    },
    codec: {
        encode: function encode(url) {
            return encodeURIComponent(url);
        },
        decode: function decode(url) {
            return decodeURIComponent(url);
        }
    },
    flags: {
        serviceWorker: false
    }
};

})()
;
//# sourceMappingURL=en.config.js.map