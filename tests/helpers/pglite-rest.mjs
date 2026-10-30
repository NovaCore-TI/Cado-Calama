import assert from "node:assert/strict";

export function transport(sql) {
  return {
    async rpc(name, args) {
      try {
        const values = name === "reserve_orientation"
          ? [args.p_date,args.p_time,args.p_name,args.p_email,args.p_phone,args.p_code,args.p_token,args.p_questionnaire,JSON.stringify(args.p_comfort)]
          : [args.p_code,args.p_token,args.p_doctor,args.p_action,args.p_date,args.p_time,args.p_state,args.p_note];
        assert(["reserve_orientation", "manage_orientation"].includes(name));
        const result = await sql.query(`SELECT public.${name}(${values.map((_,i)=>`$${i+1}`).join(",")}) AS value`, values);
        return { data: result.rows[0].value, error: null };
      } catch(error) { return { data: null, error: { code:error.code } }; }
    },
    from(table) {
      assert(["orientaciones_citas","bloques_disponibilidad","fechas_bloqueadas","doctores","cuestionarios_perfilamiento","preferencias_confort"].includes(table));
      const filters=[],values=[]; let columns="*",single=false,operation="select",payload=null,limit="";
      const field = name => { assert.match(name,/^[a-z_]+$/); return `"${name}"`; };
      const compare = (key,operator,value) => { filters.push(`${field(key)} ${operator} $${values.push(value)}`); return query; };
      const query = {
        select(value) { assert.match(value,/^(\*|[a-z_,]+)$/); columns=value; return query; },
        insert(value) { operation="insert";payload=value;return query; },
        update(value) { operation="update";payload=value;return query; },
        eq:(key,value)=>compare(key,"=",value), gte:(key,value)=>compare(key,">=",value), lte:(key,value)=>compare(key,"<=",value),
        gt:(key,value)=>compare(key,">",value),
        is(key,value) { assert.equal(value,null);filters.push(`${field(key)} IS NULL`);return query; },
        limit(value) { assert(Number.isInteger(value)&&value>=0);limit=` LIMIT ${value}`;return query; },
        not(key,operator,value) { assert.equal(operator,"is");assert.equal(value,null);filters.push(`${field(key)} IS NOT NULL`);return query; },
        maybeSingle() { single=true;return query; },
        single() { single=true;return query; },
        then(resolve,reject) {
          const where=filters.length?" WHERE "+filters.join(" AND "):"";
          let statement=`SELECT ${columns} FROM public.${field(table)}${where}${limit}`;
          if(operation==="insert") {
            const entries=Object.entries(payload);
            statement=`INSERT INTO public.${field(table)} (${entries.map(([key])=>field(key)).join(",")}) VALUES (${entries.map(([,value])=>`$${values.push(value)}`).join(",")}) RETURNING ${columns}`;
          } else if(operation==="update") {
            statement=`UPDATE public.${field(table)} SET ${Object.entries(payload).map(([key,value])=>`${field(key)}=$${values.push(value)}`).join(",")}${where} RETURNING ${columns}`;
          }
          return sql.query(statement,values)
          .then(result=>{
            // PostgREST serializes date columns; the native driver returns Date.
            const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?(key==="fecha"?value.toISOString().slice(0,10):value.toISOString()):value])));
            return {data:single?rows[0]||null:rows,error:null};
          },error=>({data:null,error:{code:error.code}})).then(resolve,reject); },
      };
      return query;
    },
  };
}
