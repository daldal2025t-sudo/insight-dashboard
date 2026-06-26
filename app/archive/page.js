const renderTable = (items, tabKeyForEdit, titleStr) => { 
    const isChecker = tabKeyForEdit === 'checker';

    return (
      <div className="mb-8">
        {titleStr && <h2 className="text-xl font-bold mb-4">{titleStr}</h2>}

        {/* 💰 투자 금액 입력 칸 */}
        {!isChecker && (
          <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center gap-3 shadow-sm">
            <label className="text-sm font-bold text-blue-900 whitespace-nowrap">
              💰 총 투자 금액 (원)
            </label>
            <div className="relative w-full max-w-sm">
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="예: 10000000 (1천만 원)"
                className="w-full border border-blue-200 rounded-lg py-2 px-3 pr-8 text-right font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="absolute right-3 top-2.5 text-gray-500 font-bold text-sm">원</span>
            </div>
            {budget && (
              <span className="text-xs text-blue-600 font-semibold">
                * 입력하신 금액에 맞춰 비중별 매수 수량이 자동 계산됩니다.
              </span>
            )}
          </div>
        )}

        {/* 테이블 헤더 */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 bg-gray-800 text-white p-3 rounded-t-lg text-xs md:text-sm font-bold text-center items-center">
          <div className="col-span-1 text-left pl-2">ETF 종목정보</div>
          <div>{isChecker ? '보유개수' : '목표비중 / 순서'}</div>
          <div>{isChecker ? '실시간 평가액 / 비중' : '현재가 / 등락률'}</div>
          {!isChecker && <div className="hidden md:block text-amber-300">매수 목표 수량</div>}
        </div>

        {/* 테이블 리스트 렌더링 */}
        <div className="border-x border-b border-gray-200 rounded-b-lg divide-y divide-gray-100 bg-white">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-bold text-sm">
              종목이 없습니다. 위의 검색창에서 ETF를 추가해 보세요!
            </div>
          ) : (
            items.map((etf, index) => {
              const rawPrice = getRawPrice(etf.value);
              const targetWeightValue = parseFloat(String(etf.targetWeight).replace('%', '')) || 0;
              const allocatedAmount = budget ? (Number(budget) * targetWeightValue) / 100 : 0;
              const sharesToBuy = rawPrice > 0 ? Math.floor(allocatedAmount / rawPrice) : 0; 

              return (
                <div key={etf.code} className="grid grid-cols-3 md:grid-cols-4 gap-2 p-3 items-center text-center text-sm hover:bg-gray-50 transition">
                  {/* 1열: 종목 이름 및 삭제 버튼 */}
                  <div className="col-span-1 flex items-center gap-2 text-left pl-1">
                    {!isChecker && (
                      <button onClick={() => handleRemoveStockFromTab(tabKeyForEdit, etf.code)} className="text-gray-300 hover:text-red-500 text-xs font-bold transition shrink-0 p-1">
                        ✕
                      </button>
                    )}
                    <div>
                      <div className="font-bold text-gray-900 leading-tight">{etf.name}</div>
                      <div className="text-[10px] text-gray-400">ETF {etf.code}</div>
                    </div>
                  </div>

                  {/* 2열: 비중/순서 조절 또는 보유개수 입력 */}
                  <div className="flex justify-center items-center gap-1">
                    {isChecker ? (
                      <input type="number" min="0" placeholder="0" value={etf.qty === 0 ? '' : etf.qty} onChange={(e) => handleQtyChange(etf.code, e.target.value)} className="w-full max-w-[70px] text-center border border-gray-300 rounded-lg p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col">
                          <button onClick={() => handleMoveOrder(tabKeyForEdit, index, 'up')} disabled={index === 0} className="hover:text-black disabled:opacity-20 leading-none py-0.5 text-[10px]">▲</button>
                          <button onClick={() => handleMoveOrder(tabKeyForEdit, index, 'down')} disabled={index === items.length - 1} className="hover:text-black disabled:opacity-20 leading-none py-0.5 text-[10px]">▼</button>
                        </div>
                        <input type="text" value={etf.targetWeight || '0%'} onChange={(e) => handleWeightChange(tabKeyForEdit, etf.code, e.target.value)} className="w-12 border border-gray-200 rounded text-center text-xs font-bold bg-slate-50 text-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none py-1 m-0" />
                      </div>
                    )}
                  </div>

                  {/* 3열: 평가액/현재가 */}
                  <div className="flex flex-col items-center justify-center leading-tight">
                    {isChecker ? (
                      <>
                        <span className="font-bold text-gray-800">{etf.evalValue.toLocaleString('ko-KR')}원</span>
                        <span className="text-[10px] text-gray-500">{etf.realWeight.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-gray-900">{etf.value}원</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {etf.isUp === true && <svg className="w-2.5 h-2.5 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
                          {etf.isUp === false && <svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
                          <span className={`text-[10px] font-bold ${etf.isUp === true ? 'text-pink-600' : etf.isUp === false ? 'text-blue-500' : 'text-gray-500'}`}>{etf.changeAmt}원 ({etf.change})</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 4열: 매수 목표 수량 및 금액 */}
                  {!isChecker && (
                    <div className="col-span-3 md:col-span-1 flex flex-row md:flex-col justify-center items-center gap-2 md:gap-0 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0">
                      <span className="md:hidden text-xs font-bold text-gray-500">매수 목표: </span>
                      {budget ? (
                        <>
                          <span className="font-extrabold text-amber-600 text-base">{sharesToBuy.toLocaleString('ko-KR')} 주</span>
                          <span className="text-[10px] text-gray-400">({Math.floor(allocatedAmount).toLocaleString('ko-KR')}원 배정)</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };