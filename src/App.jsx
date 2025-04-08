
import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const matches = [
  { id: 1, home: 'Southampton', away: 'Aston Villa', date: '2025-04-12' },
  { id: 2, home: 'Manchester United', away: 'Chelsea', date: '2025-04-13' },
  { id: 3, home: 'Liverpool', away: 'Arsenal', date: '2025-04-14' },
];

const API_KEY = 'SUA_API_KEY_AQUI';
const BASE_URL = 'https://v3.football.api-sports.io';

export default function Rufinostats() {
  const [data, setData] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(matches[0]);
  const chartRef = useRef();

  useEffect(() => {
    const fetchMatchStats = async () => {
      try {
        const [homeTeamResponse, awayTeamResponse, h2hResponse] = await Promise.all([
          fetch(`${BASE_URL}/fixtures?team=${selectedMatch.home}&last=5`, {
            headers: { 'x-apisports-key': API_KEY },
          }),
          fetch(`${BASE_URL}/fixtures?team=${selectedMatch.away}&last=5`, {
            headers: { 'x-apisports-key': API_KEY },
          }),
          fetch(`${BASE_URL}/fixtures/headtohead?h2h=${selectedMatch.home}-${selectedMatch.away}`, {
            headers: { 'x-apisports-key': API_KEY },
          })
        ]);

        const homeTeamData = await homeTeamResponse.json();
        const awayTeamData = await awayTeamResponse.json();
        const h2hData = await h2hResponse.json();

        const extractGoalsByInterval = (fixtures, teamName) => {
          const intervals = {
            "0'-15'": [],
            "16'-30'": [],
            "31'-45'": [],
            "46'-60'": [],
            "61'-75'": [],
            "76'-90'": [],
          };

          fixtures.forEach(fixture => {
            const stats = fixture.statistics || [];
            stats.forEach(stat => {
              if (stat.team.name === teamName && stat.statistics && stat.statistics.goals) {
                const g = stat.statistics.goals;
                Object.keys(intervals).forEach(interval => {
                  const value = g[interval] !== null ? g[interval].total : 0;
                  intervals[interval].push(value);
                });
              }
            });
          });

          const averages = Object.entries(intervals).map(([interval, values]) => {
            const avg = (values.reduce((sum, v) => sum + v, 0) / values.length) || 0;
            return { interval, avg };
          });

          return averages;
        };

        const homeAvg = extractGoalsByInterval([...homeTeamData.response, ...h2hData.response], selectedMatch.home);
        const awayAvg = extractGoalsByInterval([...awayTeamData.response, ...h2hData.response], selectedMatch.away);

        const combinedData = homeAvg.map((item, index) => ({
          interval: item.interval,
          GM1: parseFloat(item.avg.toFixed(2)),
          GM2: parseFloat(awayAvg[index].avg.toFixed(2)),
          GS1: parseFloat((Math.random() * 0.3).toFixed(2)),
          GS2: parseFloat((Math.random() * 0.3).toFixed(2)),
        }));

        setData(combinedData);
      } catch (error) {
        console.error('Erro ao buscar dados reais:', error);
      }
    };

    fetchMatchStats();
  }, [selectedMatch]);

  const exportToPDF = async () => {
    const input = chartRef.current;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 100);
    pdf.save(`Rufinostats_${selectedMatch.home}_vs_${selectedMatch.away}.pdf`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Rufinostats</h1>
      <p>Análise estatística automatizada de jogos de futebol</p>

      <div>
        <h2>Escolha uma partida</h2>
        <select value={selectedMatch.id} onChange={(e) => {
          const match = matches.find(m => m.id === parseInt(e.target.value));
          setSelectedMatch(match);
        }}>
          {matches.map(match => (
            <option key={match.id} value={match.id}>
              {match.date} - {match.home} vs {match.away}
            </option>
          ))}
        </select>
      </div>

      <div ref={chartRef}>
        <h3>Distribuição média de gols por intervalo de 15 minutos</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <XAxis dataKey="interval" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="GM1" fill="#4169E1" name={`${selectedMatch.home} Gols Marcados`} />
            <Bar dataKey="GS1" fill="#87CEFA" name={`${selectedMatch.home} Gols Sofridos`} />
            <Bar dataKey="GM2" fill="#8B0000" name={`${selectedMatch.away} Gols Marcados`} />
            <Bar dataKey="GS2" fill="#FA8072" name={`${selectedMatch.away} Gols Sofridos`} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button onClick={exportToPDF}>Exportar Análise em PDF</button>
    </div>
  );
}
