import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function FinalRevealPhase() {
  const { view } = useGameState();

  return (
    <div className="w-full max-w-5xl">
      <h3 className="text-2xl font-bold mb-6 text-center text-yellow-500">真相大白：全员质量揭示</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-4 border-b border-gray-700">矿工</th>
              <th className="p-4 border-b border-gray-700">轮次</th>
              <th className="p-4 border-b border-gray-700">申报质量</th>
              <th className="p-4 border-b border-gray-700">真实质量</th>
              <th className="p-4 border-b border-gray-700">虚报判定</th>
              <th className="p-4 border-b border-gray-700">罚款</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {view?.revealData?.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-900/50 transition">
                <td className="p-4 font-bold">{entry.minerId}</td>
                <td className="p-4 text-gray-400">{entry.round}</td>
                <td className="p-4 font-mono">{entry.declaredQuality}</td>
                <td className="p-4 font-mono text-blue-400">{entry.trueQuality}</td>
                <td className="p-4">
                  {entry.isCheat ? (
                    <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded">虚报</span>
                  ) : (
                    <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded">诚实</span>
                  )}
                </td>
                <td className="p-4 text-red-400">-{entry.penaltyAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
