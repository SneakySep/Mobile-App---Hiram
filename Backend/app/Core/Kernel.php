<?php

declare(strict_types=1);

namespace App\Core;

use App\Models\AuthToken;
use Throwable;

/**
 * Boots the app, matches a route, runs middleware, and writes the response.
 */
final class Kernel
{
    private Router $router;

    public function __construct(private readonly string $basePath)
    {
        $this->router = new Router();
        (require $this->basePath . '/routes/api.php')($this->router);
    }

    public function handle(Request $request): Response
    {
        $match = $this->router->match($request->method, $request->path);

        if ($match === null) {
            $allowed = $this->router->allowedMethods($request->path);

            if ($allowed !== []) {
                return Response::error(
                    'method_not_allowed',
                    'That endpoint does not accept ' . $request->method . '.',
                    405
                );
            }

            return Response::error('not_found', 'Endpoint ' . $request->path . ' not found.', 404);
        }

        $request->params = $match['params'];

        foreach ($match['middleware'] as $middleware) {
            $request = $this->runMiddleware($middleware, $request);
        }

        [$controllerClass, $method] = $match['handler'];
        $controller = new $controllerClass();

        return $controller->{$method}($request);
    }

    private function runMiddleware(string $name, Request $request): Request
    {
        return match ($name) {
            'auth' => (new Auth(new AuthToken()))->authenticate($request),
            default => throw new ApiException('server_error', "Unknown middleware: {$name}", 500),
        };
    }

    /**
     * Run the request/response cycle, converting anything thrown into JSON.
     */
    public function run(): void
    {
        $request = null;
        $response = null;

        try {
            $request = Request::capture();
            $response = $this->handle($request);
        } catch (ApiException $e) {
            $response = Response::error($e->errorCode, $e->getMessage(), $e->status, $e->errors);
        } catch (Throwable $e) {
            $debug = Env::bool('APP_DEBUG', false);

            if ($debug) {
                error_log('[hiram] ' . $e::class . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            }

            $response = Response::error(
                'server_error',
                $debug
                    ? $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine()
                    : 'Something went wrong on the server.',
                500
            );
        }

        $response->send();
    }
}
