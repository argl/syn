text2wave -scale 1.5 -o test.wav -otype riff -F 44100 /etc/passwd

espeak -v mb-en1 "Hello World" | mbrola -e /usr/share/mbrola/voices/en1 - mbrola.wav

espeak -vmb-en1 --pho --phonout="./hello.pho" -w x.wav "hello world"

espeak -s 80 -vmb-de4 --pho --phonout="./hello.pho" -w x.wav -f test-de.txt && mbrola -e /usr/share/mbrola/de4/de4 hello.pho mbrola.wav


./t2w -o sable.wav -eval "(voice_cmu_us_slt_arctic_clunits)" 



cmu_us_kal_com_hts
cstr_us_ked_timit_hts
us2_mbrola
rab_diphone
us1_mbrola
en1_mbrola
cmu_us_awb_arctic_clunits
cmu_us_bdl_arctic_clunits
us3_mbrola
cmu_us_jmk_arctic_clunits
cmu_us_clb_arctic_clunits
cmu_us_slt_arctic_clunits
don_diphone
kal_diphone
cmu_us_rms_arctic_clunits