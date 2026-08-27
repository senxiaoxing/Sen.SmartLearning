/**
 * @file 鍠靛柕 路 浜屽勾绾ф暟瀛︾煯鑴氱尗鐨勫舰璞?鈥斺€?鍏釜褰㈡€佸叡鐢ㄤ竴濂楅儴浠讹紝鎸夊舰鎬佹樉闅? * @layer components  绾覆鏌擄紝鏃犱笟鍔￠€昏緫
 * @see src/components/pet/MunchkinGear.tsx 閰嶉グ灞? * @see design/06-瀹犵墿绯荤粺.md 搂6 褰㈣薄鏂瑰悜
 *
 * 鏇煎熀搴风殑鍏ㄩ儴璇嗗埆鐐规槸**鑵挎瀬鐭?*锛氳韩浣撳嚑涔庤创鐫€鍦帮紝鍥涘彧鐖瓙鍙湶鍑轰竴鎴€? * 鍥犳鍓奖鍋氭垚銆屽ぇ鍦嗗ご 锛?妯汉鐨勯暱韬€嶏紝瀹介珮姣?鈮?.55鈥斺€? * 鍥㈠洟鏄€掓褰€佸ⅷ澧ㄦ槸涓婁笅涓ょ悆銆佹尝娉㈡槸涓€涓渾锛屽洓绉嶅壀褰变簰涓嶇浉璁ゃ€? *
 * 鐪肩潧鐢?*缁胯櫣鑶?+ 绔栫灣**锛屾槸鍓嶄笁鍙兘娌＄敤杩囩殑绗洓绉嶆柟妗堛€? * 鐬冲瓟鍒绘剰鐣欐垚鍦嗚绔栨き鍦嗚€屼笉鏄粏缂濓細缁嗙紳鍦?48px 涓嬩細娑堝け锛? * 鏀惧ぇ浜嗗張鏄惧嚩鈥斺€斿畠瑕佸儚鍙尗锛屼笉鑳藉儚鍙鎯曠殑鐚€? *
 * ## 猸?姣涜壊鏄?*閾惰檸鏂戠櫧**锛堢伆鐧斤級锛屼笉鏄
 *
 * 鏇煎熀搴锋渶甯歌銆佷篃鏈€鍍忚繖涓搧绉嶇殑閰嶈壊鏄摱铏庢枒鐧?/ 姊佃壊鐏扮櫧銆? * 绗竴鐗堢敾鎴愪簡姗樼尗鈥斺€旀鏄€岀尗銆嶇殑閫氱敤绗﹀彿锛屽嵈涓嶆槸**杩欎釜鍝佺**鐨勬牱瀛愩€? *
 * 鐏扮櫧甯︽潵涓€涓柊闂锛氬皬鐧斤紙钀ㄦ懇鑰讹級涔熸槸鐧界殑锛岃€?cream 搴曟湰韬槸鏆栫殑銆? * 涓夋潯绾挎妸瀹冧滑鍒嗗紑锛? *
 * ```
 * 鐏拌**鍐?*锛?9AA3B0 涓€绯伙級   灏忕櫧鏄函鐧藉亸鍐枫€佽繖鍙槸鐏? * 铏庢枒绾瑰繀椤荤敾婊?            灏忕櫧韬笂涓€閬撶汗閮芥病鏈夛紝绾硅矾鏈韩灏辨槸璇嗗埆鐐? * 绮夐蓟瀛?+ 缁跨溂鐫涚暀鐫€         鏁村彧韬笂浠呮湁鐨勪袱澶勬殩鑹诧紝鑴稿洜姝や笉浼氱硦鎴愪竴鍥㈢伆
 * ```
 */

import { MunchkinGear } from '@/components/pet/MunchkinGear'
import type { PetArtProps } from '@/components/pet/petArtProps'

/** 宸﹀彸鐪肩殑妯悜瀹氫綅銆傜灣瀛旀瘮鐪肩櫧鍋忓唴 1px锛屼袱鍙溂鍥犳寰井鏈濅腑闂寸湅锛屾樉寰楁洿涓撴敞 */
const EYES = [
  { white: 77, iris: 78, shine: 73.5, lid: 64 },
  { white: 123, iris: 122, shine: 118.5, lid: 110 },
] as const

/** 鐚劯涓婄殑鑳￠』銆傚乏鍙冲悇涓夋牴锛屽彧鍦ㄦ渶澶у昂瀵镐笅鐢烩€斺€?8px 鏃跺畠浠彧浼氱硦鎴愯剰鐐?*/
const WHISKERS =
  'M64,129 L28,121 M64,135 L26,135 M64,141 L29,150 M136,129 L172,121 M136,135 L174,135 M136,141 L171,150'

/**
 * 娓叉煋鐭剼鐚€? *
 * @param stageIndex - 0 铔?/ 1 鐮村３ / 2鈥? 瀹屾暣浣? * @param accessories - 閰嶉グ kind 闆嗗悎锛岃 data/seed/pets.ts
 * @param asleep - 鐫＄湢鎬侊細闂溂銆佷笉鎴撮厤楗般€佸懠鍚告斁鎱€傗殸锔?涓嶅仛鐏板害
 *
 * @example
 * <MunchkinArt stageIndex={5} accessories={new Set(['bell-collar', 'satchel', 'star-hat'])} lod={3} animated asleep={false} />
 */
export function MunchkinArt({ stageIndex, accessories, lod, animated, asleep }: PetArtProps) {
  const isEgg = stageIndex === 0
  const isHatch = stageIndex === 1
  const gear = asleep ? new Set<string>() : accessories
  const live = animated && !asleep
  /** 娓呴啋鏃舵墠鎾殑鍔ㄧ敾 */
  const anim = (cls: string): string | undefined => (live ? cls : undefined)
  /** 鐫＄潃涔熻鎾殑锛堟參鍛煎惛銆侀 z锛夛紝鍙彈 animated 鎺у埗 */
  const on = (cls: string): string | undefined => (animated ? cls : undefined)

  return (
    <svg
      viewBox="0 0 200 240"
      className={`petart-anim lod${lod}`}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* 鈿狅笍 蹇呴』 userSpaceOnUse锛氬ご銆佽韩浣撱€佺溂鐫戞槸涓変釜鍚勮嚜鐙珛鐨勫厓绱狅紝
            榛樿鐨?objectBoundingBox 浼氳瀹冧滑鍚勭畻鍚勭殑娓愬彉锛?            鍚堢溂鏃堕偅鍧楃溂鐫戝氨鎴愪簡鑴镐笂涓ゅ潡棰滆壊瀵逛笉涓婄殑鏂硅ˉ涓?*/}
        <linearGradient id="catFur" x1="46" y1="40" x2="130" y2="225" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4CBD6" />
          <stop offset="100%" stopColor="#8C95A4" />
        </linearGradient>
        {/* 鑳歌吂涓庡洓鐖殑鐧姐€傗殸锔?鍋忓喎鈥斺€旀殩鐧藉湪 cream 搴曚笂浼氱洿鎺ユ秷澶?*/}
        <linearGradient id="catCream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E8ECF2" />
        </linearGradient>
        <linearGradient id="catIris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FD98A" />
          <stop offset="100%" stopColor="#4E9C57" />
        </linearGradient>
        <linearGradient id="catBag" x1="0" y1="0" x2=".2" y2="1">
          <stop offset="0%" stopColor="#63B3F2" />
          <stop offset="100%" stopColor="#2F6FA8" />
        </linearGradient>
        <linearGradient id="catHat" x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0%" stopColor="#7CC2F7" />
          <stop offset="100%" stopColor="#3E8FD0" />
        </linearGradient>
        <radialGradient id="catBell" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#FFEFB0" />
          <stop offset="100%" stopColor="#F0B429" />
        </radialGradient>
        {/* 鍏夋晥璺熺潃涓婚钃濊蛋锛屼笉鍐嶇敤鏆栨锛氭湰浣撴槸鍐风伆锛屾殩鍏夋檿浼氭樉寰楄剰 */}
        <radialGradient id="catGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#BFE3FF" stopOpacity=".9" />
          <stop offset="100%" stopColor="#63B3F2" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="230" rx="66" ry="8" fill="#000" opacity=".09" />

      {gear.has('star-hat') && (
        <circle className={anim('petart-glow')} cx="100" cy="130" r="106" fill="url(#catGlow)" />
      )}

      <g className={asleep ? on('petart-asleep') : anim('cat-breathe')}>
        {isEgg ? (
          <g>
            <path
              d="M100,44 C67,44 51,82 51,124 C51,166 73,198 100,198 C127,198 149,166 149,124 C149,82 133,44 100,44 Z"
              fill="#F2F4F8"
              stroke="#CBD2DC"
              strokeWidth="2"
            />
            {/* 姗樿壊鏂戠偣鍏堟妸姣涜壊閫忛湶鍑烘潵锛岀牬澹抽偅涓€涓嬫墠涓嶆槸浠庨浂寮€濮?*/}
            <ellipse className="d-mid" cx="78" cy="102" rx="12" ry="9" fill="#B9C1CE" opacity=".7" />
            <ellipse className="d-mid" cx="118" cy="140" rx="14" ry="10" fill="#B9C1CE" opacity=".55" />
            <ellipse cx="82" cy="76" rx="15" ry="9" fill="#FFFFFF" opacity=".6" />
          </g>
        ) : (
          <>
            <g transform={isHatch ? 'translate(100 118) scale(.62) translate(-100 -112)' : undefined}>
              {/* 灏惧反绔栬捣鏉ュ悜鍙冲集鈥斺€旂尗绔嬬潃灏惧反鏄€屽績鎯呭ソ銆嶏紝杩欏彧浼欎即姘歌繙鏄繖涓姸鎬?*/}
              <g className={anim('cat-tail')}>
                <path
                  d="M148,190 C178,186 192,154 185,126 C181,108 173,98 167,93"
                  stroke="#A6AEBC"
                  strokeWidth="21"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* 鈿狅笍 灏惧皷涓嶅仛鐧借壊銆傜矖鎻忚竟鍔犲渾澶达紝鍐嶇煭鐨勪竴鎴櫧涔熸槸涓渾鐞冿紝
                    鏁存潯灏惧反灏辨垚浜嗕妇璧锋潵鐨勪竴鏍规妫掔硸銆?                    鎹㈡垚涓夐亾鐜汗鈥斺€旇檸鏂戠尗鐨勫熬宸存湰鏉ュ氨鏈夛紝涔熷拰棰濆ご閭ｄ釜銆孧銆嶆槸涓€濂?*/}
                <path
                  className="d-mid"
                  d="M168,181 L168,195 M181,155 L195,153 M174,116 L188,119"
                  stroke="#69717F"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity=".4"
                />
              </g>

              <MunchkinGear layer="under" accessories={gear} animated={live} />

              {/* 鍚庣埅鍙湶涓€鐐癸紝鍓嶇埅鏁村彧钀藉湪韬綋澶栤€斺€旇繖涓樊鍒氨鏄€岃洞寰椾綆銆?*/}
              <ellipse cx="40" cy="212" rx="17" ry="13" fill="#8C95A4" />
              <ellipse cx="160" cy="212" rx="17" ry="13" fill="#8C95A4" />

              {/* 韬綋锛氭í韬虹殑闀垮渾锛屽 136 脳 楂?86銆傝吙鐭埌鍑犱箮鐪嬩笉瑙侊紝鍏ㄩ潬瀹冭创鍦?*/}
              <path
                d="M100,136 C58,136 32,152 32,180 C32,206 58,222 100,222
                   C142,222 168,206 168,180 C168,152 142,136 100,136 Z"
                fill="url(#catFur)"
              />
              <ellipse cx="100" cy="198" rx="44" ry="21" fill="url(#catCream)" />
              <path
                className="d-fine"
                d="M62,158 C70,164 74,172 75,180 M100,150 C108,158 111,168 111,177"
                stroke="#69717F"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity=".38"
              />

              {/* 鍓嶇埅锛氱櫧琚滃瓙銆傝惤鍦ㄨ韩浣撹疆寤撲箣澶栨墠鐪嬪緱鍑烘槸銆屼几鍑烘潵鐨勩€?*/}
              <ellipse cx="70" cy="220" rx="20" ry="12" fill="url(#catCream)" />
              <ellipse cx="130" cy="220" rx="20" ry="12" fill="url(#catCream)" />
              <path
                className="d-fine"
                d="M64,222 L64,214 M76,222 L76,214 M124,222 L124,214 M136,222 L136,214"
                stroke="#C3CAD5"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              {/* 鑰虫湹鐢诲湪澶翠箣鍓嶏紝鍙湶鍑哄ご椤朵袱渚ф帰鍑烘潵鐨勪袱涓皷 */}
              <path d="M52,80 L38,24 L90,52 Z" fill="#A6AEBC" strokeLinejoin="round" />
              <path d="M148,80 L162,24 L110,52 Z" fill="#A6AEBC" strokeLinejoin="round" />
              <path className="d-mid" d="M59,70 L49,38 L81,54 Z" fill="#F7A8A0" />
              <path className="d-mid" d="M141,70 L151,38 L119,54 Z" fill="#F7A8A0" />

              <path
                d="M100,46 C68,46 46,70 46,102 C46,132 68,152 100,152
                   C132,152 154,132 154,102 C154,70 132,46 100,46 Z"
                fill="url(#catFur)"
              />
              {/* 棰濆ご涓夐亾娣辩汗鏄檸鏂戠尗鐨勩€孧銆嶏紝璁ゅ緱鍑虹殑浜轰細蹇冧竴绗?*/}
              <path
                className="d-mid"
                d="M86,58 L82,72 M100,54 L100,70 M114,58 L118,72"
                stroke="#69717F"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity=".45"
              />
              {/* 鈿狅笍 鍙ｉ蓟鐧芥枒鐨勪笂缂橈紙y=114锛夊繀椤诲帇鍦ㄧ溂鐫戜笅缂橈紙y=110锛変箣涓嬨€?                  瀹冧咯鍘熸湰閲嶅彔锛岀潯鐫€鏃舵柟褰㈢殑鐪肩潙浼氬晝鎺夌櫧鏂戜袱涓锛?                  涓棿鍓╀竴鏉￠湶鍑烘潵鈥斺€旇劯涓婂嚟绌哄鍑轰竴涓櫧鏂瑰潡 */}
              <ellipse cx="100" cy="131" rx="31" ry="17" fill="url(#catCream)" />
              <ellipse className="d-mid" cx="62" cy="127" rx="10" ry="6" fill="#FF7A6B" opacity=".24" />
              <ellipse className="d-mid" cx="138" cy="127" rx="10" ry="6" fill="#FF7A6B" opacity=".24" />

              {/* 涓ゅ彧鐪肩潧缁撴瀯鐩稿悓锛屽彧宸í鍚戜綅缃€傜溂鐫戝垎寮€鍐欌€斺€斿悎骞剁殑璇?                  transform-origin 浼氬彇涓よ€呯殑鏁翠綋涓績锛岄棴鐪煎氨鎴愪簡浠庝腑闂村線涓よ竟鏀?*/}
              {EYES.map((e) => (
                <g key={e.lid}>
                  <ellipse cx={e.white} cy="96" rx="12.5" ry="14" fill="#FFFFFF" />
                  <ellipse cx={e.iris} cy="97" rx="10" ry="12" fill="url(#catIris)" />
                  <ellipse cx={e.iris} cy="97" rx="4.4" ry="9.2" fill="#17202F" />
                  <circle className="d-mid" cx={e.shine} cy="91" r="3.2" fill="#FFF" />
                  <rect
                    className="petart-lid"
                    x={e.lid}
                    y="80"
                    width="27"
                    height="30"
                    fill="url(#catFur)"
                    transform={asleep ? 'scale(1 1)' : 'scale(1 0)'}
                  />
                </g>
              ))}

              <path d="M93,121 L107,121 L100,131 Z" fill="#F0837A" strokeLinejoin="round" />
              <path
                d="M100,131 L100,136 M100,136 C96,143 88,143 85,138 M100,136 C104,143 112,143 115,138"
                stroke="#5A6270"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <path
                className="d-fine"
                d={WHISKERS}
                stroke="#EEF2F7"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity=".65"
              />

              <MunchkinGear layer="over" accessories={gear} animated={live} />
            </g>

            {isHatch && (
              <path
                d="M51,130 C51,170 73,200 100,200 C127,200 149,170 149,130 L136,143 L124,126
                   L112,141 L100,122 L88,141 L76,126 L64,143 Z"
                fill="#F2F4F8"
                stroke="#CBD2DC"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
      </g>

      {asleep && (
        <g fill="#3D3A38" opacity=".45" fontFamily="sans-serif" fontWeight="700">
          <text className={on('petart-zzz')} x="154" y="58" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-2')} x="154" y="58" fontSize="20">
            z
          </text>
          <text className={on('petart-zzz-3')} x="154" y="58" fontSize="20">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
