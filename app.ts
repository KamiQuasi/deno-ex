import { Application, Router, HttpError, Status, send } from "https://deno.land/x/oak/mod.ts";
import { exists } from "https://deno.land/std@0.92.0/fs/mod.ts";

const port = Deno.env.get('PORT') || Deno.env.get('OPENSHIFT_DENO_PORT') || 8080;
const ip = Deno.env.get('IP') || Deno.env.get('OPENSHIFT_DENO_IP') || '0.0.0.0';
const app = new Application();
const router = new Router();
const scriptCache = new Map<string,string>();

// Error Handling
app.use(async (context, next) => {
  try {
    await next();
  } catch (e) {
    if (e instanceof HttpError) {
      context.response.status = e.status as any;
      if (e.expose) {
        context.response.body = `<!doctype html><html><body><h1>${e.status} - ${e.message}</h1></body></html>`;
      } else {
        context.response.body = `<!doctype html><html><body><h1>${e.status} - ${Status[e.status]}</h1></body></html>`;
      }
    } else if (e instanceof Error) {
      context.response.status = 500;
      context.response.body = `<!doctype html><html><body><h1>500 - Internal Server Error</h1></body></html>`;
      console.log("Unhandled Error:", e.message);
      console.log(e.stack);
    }
  }
});

// Request Routing
router
  .get("/", ctx=> {
    ctx.response.type = 'text/html; charset=utf-8';
    ctx.response.body = `<!doctype html>
    <html>
      <body>
        <h1>Deno Example</h1>
        <sample-wc>With Web Component</sample-wc>
        <script src="/assets/scripts/example.js"></script>
      </body>
    </html>`;
  })
  .get("/post", ctx => {
    ctx.response.type = 'text/html; charset=utf-8';
    ctx.response.body = `<!doctype html><html><body><ul></ul></body></html>`
  })
  .get("/post/edit/:post", async ctx => {
    const post = await Deno.readTextFile(`./posts/${ctx.params.post}.html`);
    console.log('EDIT POST:',ctx.params.post, post);
    ctx.response.type = 'text/html; charset=utf-8';
    ctx.response.body = `<!doctype html>
    <html>
    <body>
    <div id="editor">${post}</div>
    <script src="https://cdn.ckeditor.com/ckeditor5/27.0.0/classic/ckeditor.js"></script>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@ckeditor/ckeditor5-autosave@27.0.0/build/autosave.js"></script>
    <script>
    let editor;
    function saveData(data) {
      fetch()
    }
    ClassicEditor
      .create(document.querySelector('#editor'),{
        plugins: [Autosave],
        autosave: {
          save (editor) {
            return saveData( editor.getData());
          }
        }
      })
      .then(newEditor=> {editor=newEditor;})
      .catch(error=>{console.error(error);});
    </script>
    </body>
    </html>`;
  })
  .post("/post/:post", async ctx=> {
    if (ctx.request.hasBody) {
      const {value:postBody} = await ctx.request.body();
      const data:string = typeof postBody !== 'undefined' ? postBody.toString() : '';
      const post = await Deno.writeTextFile(`./posts/${ctx.params.post}.html`,data);
      ctx.response.status = 201;
      ctx.response.body = {
        success: true,
        data: data
      }
    }
  })
  .get("/post/:post", async ctx => {
    const post = await Deno.readTextFile(`./posts/${ctx.params.post}.html`);
    console.log('READ POST:',ctx.params.post, post);
    ctx.response.body = `<!doctype html>
    <html>
    <body>
    ${post}
    <div><a href="/post/edit/${ctx.params.post}">EDIT</a></div>
    <script src="https://cdn.ckeditor.com/ckeditor5/27.0.0/classic/ckeditor.js"></script>
    </body>
    </html>`;
  })
  .get("/assets/scripts/:path+", async ctx => {
    const fileName = `./assets/scripts/${ctx.params['path']}`;
    ctx.response.type = 'application/javascript';
    if (scriptCache.has(fileName)) {
      ctx.response.body = scriptCache.get(fileName);
    } else if (await exists(fileName.replace('.js','.ts'))) {
      const { files, diagnostics } = await Deno.emit(fileName.replace('.js','.ts'), {
        check: false,
        bundle: 'esm',
        compilerOptions: {
          lib: ['es6','dom'],
          module: 'es6',
          target: 'es6'
        }
      });
      if (diagnostics.length) {
        console.warn(Deno.formatDiagnostics(diagnostics));
      }
      scriptCache.set(fileName, files['deno:///bundle.js']);
      ctx.response.body = scriptCache.get(fileName);
    } else {
      ctx.response.body = '';
    }
  })
  .get("/assets/:path+", async ctx => {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}`
    });
  });

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener('listen', ({hostname, port}) => {
  console.log(`Serving ${Deno.cwd()}`);
  console.log(`Start listening on ${hostname}:${port}`);
});

await app.listen({hostname: "0.0.0.0", port: 8080 });