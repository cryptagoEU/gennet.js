import {defineBuildConfig} from 'unbuild';

export default defineBuildConfig({
    entries: ['src/index'],
    declaration: 'compatible',
    clean: true,
    rollup: {
        emitCJS: true,
    },
});