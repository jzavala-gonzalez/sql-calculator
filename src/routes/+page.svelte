<script lang='ts'>
    import { Button } from "$lib/components/ui/button";
    import { get_db, start_pyodide } from "$lib/db_utils";
    import { onMount } from "svelte";

    let db = null;
    let pyodide = null;
    let ready = false;
    onMount(() => {
        let promises = [
        // Load Pyodide
        start_pyodide()
        .then((pyodide_) => {
            pyodide = pyodide_;
            console.log('pyodide loaded', pyodide)
        }),

        // Load DuckDB
        get_db()
        .then((db_) => {
            db = db_.db;
            console.log('db loaded', db)
        })
        ]

        Promise.allSettled(promises).then((results) => {
            console.log('all loaded', results)
            results.forEach(r => console.log(r.status))
            ready = true;

            console.log(
                'running python code',
                pyodide.runPython(`
                from sqlglot import parse_one
                ast = parse_one('select * from mytable')
                str(ast)
                `)
            )
        })
    });

    let shown_text: string = "Hello world";
    

</script>
<textarea bind:value={shown_text} class='bg-gray-200 w-full'/>

<h2>Select</h2>
<Button
    disabled={!ready}
>
Some button
</Button>

<p>Shown text: {shown_text}</p>