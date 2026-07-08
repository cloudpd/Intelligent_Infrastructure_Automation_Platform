import React, { useState } from 'react'
// import GallerySlider from './GalleySlider/GallerySlider'
// import GalleryCategories from './GalleryCategories/GalleryCategories'
// import Products from '../Products/Products'
import Loading from '../Shared/Loading/Loading'


export default function Home() {

//   let [arrive1, setArrive1] = useState(false);
//   let [arrive2, setArrive2] = useState(false);

//   function checkData(count) {
//     if (count == 1)
//       setArrive1(true);
//     if (count == 2)
//       setArrive2(true);
//   }

  return (
    <div className='min-vh-100  ' >


      {/* {arrive1 && arrive2 ? <> <GallerySlider /> </>
        : <Loading />}


      <GalleryCategories home={true} check={checkData} />
      <Products home={true} check={checkData} /> */}

<h1>hello this is home</h1>
    </div>

  )
}