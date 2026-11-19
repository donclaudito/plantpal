import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { readPages, normalizeName, hospitalKey } from '../../shared/shiftPricing.ts';
import { casarConsultas, momentoDoRegisto, rotuloConsulta } from '../../shared/consultasProcedimentos.ts';

const mesmoValor = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.005;

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito ao financeiro.' }, { status: 403 });

    const { year, month, doctor = 'all', hospital = 'all' } = await req.json().catch(() => ({}));
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12 || [doctor, hospital].some(v => typeof v !== 'string' || v.length > 200)) {
      return Response.json({ error: 'Filtros inválidos.' }, { status: 400 });
    }

    const mm = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const end = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    const janelaPlantao = { $or: [{ date: { $gte: start, $lte: end } }, { date: { $regex: `^[0-9]{2}/${mm}/${year}$` } }] };
    const janelaProcedimento = { $or: [{ data: { $gte: start, $lte: end } }, { data: { $regex: `^[0-9]{2}/${mm}/${year}$` } }] };

    const [shifts, procedimentos, doctors, hospitals] = await Promise.all([
      readPages(client.entities.Shift, { $and: [{ period: 'consultas' }, janelaPlantao] }),
      readPages(client.entities.Procedimento, { $and: [{ tipo: 'Consulta' }, janelaProcedimento] }),
      readPages(client.entities.Doctor, {}, 'full_name'),
      readPages(client.entities.Hospital, {}, 'name'),
    ]);

    const doctorName = doctor === 'all' ? null : doctors.find(d => d.id === doctor)?.full_name || doctor;
    const hospitalName = hospital === 'all' ? null : hospitals.find(h => h.id === hospital)?.name || hospital;
    const doFiltro = (nomeMedico, nomeHospital) =>
      (!doctorName || normalizeName(nomeMedico) === normalizeName(doctorName)) &&
      (!hospitalName || hospitalKey(nomeHospital) === hospitalKey(hospitalName));

    const plantoes = shifts.filter(s => doFiltro(s.doctor_name, s.hospital));
    const consultas = procedimentos.filter(p => doFiltro(p.doctor_name, p.hospital_name));
    const { pares, plantoesSemProcedimento } = casarConsultas(plantoes, consultas);

    const tarefas = [];

    for (const shift of plantoesSemProcedimento) {
      const quantidade = Number(shift.quantidade_consultas) || 0;
      const valor = Number(shift.valor_consulta) || 0;
      tarefas.push({
        tipo: 'criado',
        run: () => client.entities.Procedimento.create({
          tipo: 'Consulta',
          doctor_id: shift.doctor_id || '',
          doctor_name: shift.doctor_name || '',
          hospital_id: hospitals.find(h => hospitalKey(h.name) === hospitalKey(shift.hospital))?.id || '',
          hospital_name: shift.hospital || '',
          data: shift.date,
          tipo_pagamento: hospitalKey(shift.hospital).includes('SUS') ? 'SUS' : 'Convenio',
          descricao: rotuloConsulta(shift.shift_type),
          especialidade: shift.specialty || '',
          quantidade,
          valor,
        }),
      });
    }

    for (const { shift, procedimento } of pares) {
      const quantidade = Number(shift.quantidade_consultas) || 0;
      const valor = Number(shift.valor_consulta) || 0;
      const quantidadeProcedimento = Number(procedimento.quantidade) || 0;
      const valorProcedimento = Number(procedimento.valor) || 0;
      if (mesmoValor(quantidadeProcedimento, quantidade) && mesmoValor(valorProcedimento, valor)) continue;

      // O registo alterado mais recentemente manda: o procedimento corrige o
      // plantão, ou o plantão corrige o procedimento.
      if (momentoDoRegisto(procedimento) >= momentoDoRegisto(shift)) {
        tarefas.push({
          tipo: 'atualizado',
          run: () => client.entities.Shift.update(shift.id, {
            quantidade_consultas: quantidadeProcedimento,
            valor_consulta: valorProcedimento,
          }),
        });
      } else {
        tarefas.push({
          tipo: 'atualizado',
          run: () => client.entities.Procedimento.update(procedimento.id, {
            quantidade,
            valor,
            especialidade: shift.specialty || procedimento.especialidade || '',
          }),
        });
      }
    }

    let criados = 0;
    let atualizados = 0;
    let falhas = 0;
    for (let i = 0; i < tarefas.length; i += 6) {
      const lote = tarefas.slice(i, i + 6);
      const resultados = await Promise.allSettled(lote.map(tarefa => tarefa.run()));
      resultados.forEach((resultado, indice) => {
        if (resultado.status === 'rejected') { falhas += 1; return; }
        if (lote[indice].tipo === 'criado') criados += 1;
        else atualizados += 1;
      });
    }

    return Response.json({
      criados,
      atualizados,
      falhas,
      plantoes: plantoes.length,
      procedimentos: consultas.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}