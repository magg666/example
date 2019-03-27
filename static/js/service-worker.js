"use strict";

console.log('WORKER: executing.');

/* Numer wersji może się okazać pomocny podczas updatu naszego service workera.
*/
var version = 'v1::';

/* Poniższe zasoby będą ściągane podczas instalacji naszej progresywnej appki na komputer czy komórkę. Jeżeli coś się nie powiedzie, service worker nie zostanie zainstalowany.
*/
var offlineFundamentals = [

    '/index.html',
    '/js/style.css',
    '/js/scripts.js'
];

/*  Instalacja zostanie rozpoczęta, gdy serviceworker.js zostanie najpierw zainstalowany. Możesz użyć "event listener", aby przygotować sw.js do obsługi
   plików, gdy odwiedzający są w trybie offline.
*/
self.addEventListener("install", function (event) {
    console.log('WORKER: install event in progress.');
    /* Użycie event.waitUntil(p) blokuje instalacje na poniższym "promise" czyli
       asychonicznym wezwaniu. Jeżeli "promise" zostanie odrzucony, service worker nie będzie zainstalowany.
    */
    event.waitUntil(
        /* Wbudowany API "Cache" oparty na "promise" pomaga w cachowaniu odpowiedzi, znajdowaniu i usuwaniu plików.
        */
        caches
        /* To pozwala aby otwierac cache po nazwie, ta metoda także zwraca "promise". Możemy używać "versioned cache name", przypisanej nazwy cache aby poźniej pozbywac się starszych wpisów / "entries" z cache'u, kiedy będziemy wprowadzać nowego service workera.
        */
            .open(version + 'fundamentals')
            .then(function (cache) {
                /* Po otworzeniu cache, możemy go uzupełnić z zapisanymi wcześniej "offline fundamentals".
                */
                return cache.addAll(offlineFundamentals);
            })
            .then(function () {
                console.log('WORKER: install completed');
            })
    );
});

/* Zdarzenie pobierania jest wywoływane za każdym razem, gdy strona kontrolowana przez tego serviceworker.js żada zasoby (request) zasób. Nie jest to tylko  ograniczone do żądania  `fetch` lub nawet XMLHttpRequest, ale nawet do request'u strony HTML przy pierwszym załadowaniu, plików JS, CSS, fontów czy obrazów itp.
*/
self.addEventListener("fetch", function (event) {
    console.log('WORKER: fetch event in progress.');

    /* Powinnismy cacho'wac tylko "GET request", resztą niech zajmie się przeglądarka poprzez zarządzanie (handling) nieudanymi requestów "POST,PUT,PATCH, itp".
    */
    if (event.request.method !== 'GET') {
        /*
    Jeśli nie zablokujemy zdarzenia, jak pokazano poniżej, żądanie zostanie wysłane przez sieć jak zwykle.
        */
        console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
        return;
    }
    /* Podobnie jak "event.waitUntil", blokujemy zdarzenie pobierania na "promise"
       Wynik realizacji zostanie użyty jako odpowiedź, a odrzucenie zakończy się na
       Odpowiedzi (http) informująca o awarii.
    */
    event.respondWith(
        caches
        /*
  Ta metoda zwraca "promise", która rozwiązuje problem z dopasowaniem wpisu pamięci podręcznej (cache) do naszego request'u. Gdy "promise" zostanie spełniony, będziemy mogli udzielić odpowiedzi na żądanie pobrania.
        */

            .match(event.request)
            .then(function (cached) {

                /* Nawet jeśli odpowiedź znajduje się w naszej pamięci podręcznej, robimy wezwanie także do do sieci. Ten wzorzec jest znany z wywoływania "świeżych" reakcji,gdzie natychmiast zwracamy buforowane odpowiedzi, a tymczasem ciągniemy odpowiedź sieciowa i zapisz ją w pamięci podręcznej.
                */
                var networked = fetch(event.request)
                // We handle the network request with success and failure scenarios.
                    .then(fetchedFromNetwork, unableToResolve)
                    // We should catch errors on the fetchedFromNetwork handler as well.
                    .catch(unableToResolve);

                /* We return the cached response immediately if there is one, and fall
                   back to waiting on the network as usual.
                */
                console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
                return cached || networked;

                function fetchedFromNetwork(response) {

                    /* Klonujemy  "response". To jest odpowiedź, która będzie przechowywana w pamięci podręcznej ServiceWorker. */

                    var cacheCopy = response.clone();

                    console.log('WORKER: fetch response from network.', event.request.url);

                    caches
                    //Otwieramy pamięć podręczną, aby zapisać odpowiedź na to żądanie.

                        .open(version + 'pages')
                        .then(function add(cache) {

                            /* Przechowujemy odpowiedź na to żądanie. Później ta odpowiedz będzie  dostępna dla wywołań caches.match (event.request) podczas wyszukiwania zbuforowanych odpowiedzi.
                            */
                            return cache.put(event.request, cacheCopy);
                        })
                        .then(function () {
                            console.log('WORKER: fetch response stored in cache.', event.request.url);
                        });

                    // Zwróć odpowiedź, aby obietnica została spełniona.
                    return response;
                }

                /* Gdy wywoływana jest ta metoda, oznacza to, że nie jesteśmy w stanie wytworzyć odpowiedzi z pamięci podręcznej lub sieci. Dobra okazja do wyświetlenia jakies wiadomosci jeżeli wszystko inne zawiedzie. Typu "Usługa niedostępna" lub ogólna wiadomość błędu.
                */
                function unableToResolve() {


                    console.log('WORKER: fetch request failed in both cache and network.');

                    /* Tutaj programujemy odpowiedź. Pierwszym parametrem jest
                       treść odpowiedzi, a druga określa opcje odpowiedzi.
                    */

                    return new Response('<h1>Service Unavailable</h1>', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/html'
                        })
                    });
                }
            })
    );
});

/* Zdarzenie activate uruchamia się po pomyślnym zainstalowaniu modułu serwisowego.
Jest to najbardziej przydatne przy wycofywaniu starszej wersji, jeżeli serviceworker.js został zainstalowany poprawnie. W tym przykładzie usuwamy stare pamięci podręczne, które nie pasują do wersji w właśnie zakończonym procesie instalacyjnym.
*/
self.addEventListener("activate", function (event) {
    /* Podobnie jak w przypadku instalacji, event.waitUntil aktywuje się na "promise".  Aktywacja zakończy się niepowodzeniem, dopóki "promise" nie zostanie spełniony.
    */
    console.log('WORKER: activate event in progress.');

    event.waitUntil(
        caches
        /*
  Ta metoda zwraca obietnicę, która rozwiąże "array"" dostępnych
           kluczy pamięci podręcznej
        */
            .keys()
            .then(function (keys) {
                // Zwracamy "promise", która "settle"  się po usunięciu wszystkich nieaktualnych pamięci podręcznych.
                return Promise.all(
                    keys
                        .filter(function (key) {
                            //Filtruj według kluczy, które nie rozpoczynają się od prefiksu najnowszej wersji.
                            return !key.startsWith(version);
                        })
                        .map(function (key) {
                            /* Zwróc "promise" która zostala spelniona po tym jak przestarzaly cache zostal zwrocony.
                            */
                            return caches.delete(key);
                        })
                );
            })
            .then(function () {
                console.log('WORKER: activate completed.');
            })
    );
});