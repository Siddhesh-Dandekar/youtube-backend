const formatMeta = (meta) => {
    if (!meta) return '';
    if (meta instanceof Error) return ` ${meta.stack || meta.message}`;
    if (typeof meta === 'string') return ` ${meta}`;
    try {
        return ` ${JSON.stringify(meta)}`;
    } catch {
        return ' [unserializable meta]';
    }
};

const log = (level, message, meta) => {
    const line = JSON.stringify({
        level,
        message,
        time: new Date().toISOString(),
        meta: meta && !(meta instanceof Error) ? meta : undefined,
        error: meta instanceof Error ? meta.message : undefined,
    });

    if (level === 'error') {
        console.error(line);
    } else if (level === 'warn') {
        console.warn(line);
    } else {
        console.log(line);
    }
};

const logger = {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', `${message}${formatMeta(meta)}`),
};

export default logger;
