<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Very small regex router with :param placeholders.
 */
final class Router
{
    /** @var array<string, list<array{pattern:string, handler:array{0:class-string,1:string}, middleware:array<string>}>> */
    private array $routes = [];

    /** @param array{0:class-string,1:string} $handler */
    public function get(string $path, array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    /** @param array{0:class-string,1:string} $handler */
    public function post(string $path, array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    /** @param array{0:class-string,1:string} $handler */
    public function put(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    /** @param array{0:class-string,1:string} $handler */
    public function patch(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    /** @param array{0:class-string,1:string} $handler */
    public function delete(string $path, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    /** @param array{0:class-string,1:string} $handler */
    private function add(string $method, string $path, array $handler, array $middleware): void
    {
        $pattern = preg_replace('/\/:([a-zA-Z_][a-zA-Z0-9_]*)/', '/(?P<$1>[^/]+)', '/' . trim($path, '/'));

        $this->routes[$method][] = [
            'pattern' => '#^' . $pattern . '$#',
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    /**
     * @return array{handler:array{0:class-string,1:string}, params:array<string,string>, middleware:array<string>}|null
     */
    public function match(string $method, string $path): ?array
    {
        foreach ($this->routes[$method] ?? [] as $route) {
            if (preg_match($route['pattern'], $path, $matches) === 1) {
                $params = [];
                foreach ($matches as $key => $value) {
                    if (is_string($key)) {
                        $params[$key] = $value;
                    }
                }

                return [
                    'handler' => $route['handler'],
                    'params' => $params,
                    'middleware' => $route['middleware'],
                ];
            }
        }

        return null;
    }

    /**
     * Does the path exist under a different verb? Used for clean 405s.
     */
    public function allowedMethods(string $path): array
    {
        $allowed = [];
        foreach ($this->routes as $method => $routes) {
            foreach ($routes as $route) {
                if (preg_match($route['pattern'], $path) === 1) {
                    $allowed[] = $method;
                    break;
                }
            }
        }

        return $allowed;
    }
}
