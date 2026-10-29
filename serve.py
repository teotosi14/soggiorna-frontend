# Server statico per la SPA con fallback: le vecchie URL "a pagina" (es.
# /preferiti.html, retaggio di quando il sito non era ancora una SPA) vengono
# rediretti alla rotta hash corrispondente (/index.html#/preferiti) invece di
# dare 404, dato che oggi il sito e' un unico index.html con router lato
# client basato su hash (vedi README, sezione "Architettura frontend").
import functools
import http.server
import os
from urllib.parse import urlsplit

PORT = 5500


class SpaFallbackHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Server di sviluppo: mai far cachare al browser una versione vecchia di JS/CSS/HTML,
        # altrimenti una modifica appena distribuita puo' restare invisibile senza un hard refresh.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        parsed = urlsplit(self.path)
        path = parsed.path
        _, ext = os.path.splitext(path)
        is_route_like = ext == "" or (ext == ".html" and path != "/index.html")
        if is_route_like and not os.path.exists(self.translate_path(path)):
            route = path[:-len(".html")] if path.endswith(".html") else path
            location = f"/index.html#{route}"
            if parsed.query:
                location += f"?{parsed.query}"
            self.send_response(302)
            self.send_header("Location", location)
            self.end_headers()
            return
        super().do_GET()


if __name__ == "__main__":
    handler = functools.partial(SpaFallbackHandler, directory=os.path.dirname(os.path.abspath(__file__)) or ".")
    http.server.test(HandlerClass=handler, port=PORT)
