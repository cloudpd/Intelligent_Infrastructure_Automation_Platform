import logo from './logo.svg';
import './App.css';
import Navbar from './Components/Navbar/Navbar';
import Home from './Components/Home/Home';
// import GallerySlider from './Components/Home/GalleySlider/GallerySlider';
// import Products from './Components/Products/Products';
// import Cart from './Components/Cart/Cart';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Mainlayout from './Components/Layouts/Mainlayout/Mainlayout.jsx';
import Notfound from './Components/Layouts/Notfoundlayout/Notfound';
// import Categories from './Components/Categories/Categories';
// import Proddetails from './Components/Products/ProductDetails/Proddetails';
import Login from './Components/Login/Login';
import Register from './Components/Register/Register';
// import Brands from './Components/Brands/Brands';
// import CartContextProvider from './Context/CartContext';
// import Profile from './Components/Profile/Profile';
import AuthProvider from './Context/AuthContext.jsx';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
// import Allorders from './Components/Orders/Allorders';
import Recovery from './Components/Login/Recovery';
import Projects from './Components/Projects/Projects.jsx';
import ProjectDetails from './Components/Projects/ProjectDetails.jsx';
import Services from './Components/Services/Services.jsx';
import GithubTokens from './Components/GithubTokens/GithubTokens.jsx';
import DockerizePage from './Components/Dockerize/DockerizePage.jsx';
// import Wishlist from './Components/Wishlist/Wishlist';
// import WishContextProvider from './Context/WishContext';
// import ProductCategory from './Components/Categories/ProductCategory';
// import ProductSubCategorey from './Components/Categories/ProductSubCategorey';
// import ProductBrand from './Components/Brands/ProductBrand';
import KubernetesWizard from './Components/Kubernetes/KubernetesWizard.jsx';
import CIServicePage from './Components/ci-service/CIServicePage.jsx';




function App() {

  const routes = createBrowserRouter([
    {
      path: '/', element: <Mainlayout />,
      children: [
        { index: true, element: <Login /> },
        {
          path: "/our-app", element:
            <ProtectedRoute>
              {/* <WishContextProvider> */}
                <Home />
              {/* </WishContextProvider> */}
            </ProtectedRoute>
        },

        {
          path: '/home', element:

            <ProtectedRoute>
              {/* <WishContextProvider> */}
                <Home />
              {/* </WishContextProvider> */}
            </ProtectedRoute>
        },
        {
          path: '/projects', element:
            <ProtectedRoute>
              {/* <WishContextProvider> */}
                <Projects />
              {/* </WishContextProvider> */}
            </ProtectedRoute>
        },
        {
          path: '/projects/:projectId', element:
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
        },
        {
          path: '/services', element:
            <ProtectedRoute>
              {/* <WishContextProvider> */}
                <Services />
              {/* </WishContextProvider> */}
            </ProtectedRoute>
        },
        {
          path: '/github-tokens', element:
            <ProtectedRoute>
              <GithubTokens />
            </ProtectedRoute>
        },
        {
          path: '/services/:serviceId/dockerize', element:
            <ProtectedRoute>
              <DockerizePage />
            </ProtectedRoute>
        },
        {
          path: '/projects/:projectId/services/:serviceId/ci', element:
            <ProtectedRoute>
              <CIServicePage />
            </ProtectedRoute>
        },
        {
          path: '/projects/:projectId/services/:serviceId/k8s', element:
            <ProtectedRoute>
              <KubernetesWizard />
            </ProtectedRoute>
        },
                {
          path: '/k8s', element:
            <ProtectedRoute>
              <KubernetesWizard />
            </ProtectedRoute>
        },
                // {
        //   path: '/wishlist', element:
        //     <ProtectedRoute>
        //       {/* <WishContextProvider> */}
        //         <Wishlist />
        //       {/* </WishContextProvider> */}
        //     </ProtectedRoute>
        // },
        // {
        //   path: '/productcategory/:categoryId', element:

        //     <ProtectedRoute>
        //       {/* <WishContextProvider> */}
        //         <ProductCategory />
        //       {/* </WishContextProvider> */}
        //     </ProtectedRoute>

        // },
        // {
        //   path: '/productsubcategory/:subcategoryId', element:

        //     <ProtectedRoute>
        //       <WishContextProvider>
        //         <ProductSubCategorey />
        //       </WishContextProvider>
        //     </ProtectedRoute>

        // },
        // {
        //   path: '/productbrand/:brandId', element:

        //     <ProtectedRoute>
        //       <WishContextProvider>
        //         <ProductBrand />
        //       </WishContextProvider>
        //     </ProtectedRoute>

        // },
        // { path: '/cart', element: <ProtectedRoute ><Cart /> </ProtectedRoute> },
        // { path: '/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
        // { path: '/categories', element: <ProtectedRoute><Categories /></ProtectedRoute> },
        // { path: '/brands', element: <ProtectedRoute><Brands /></ProtectedRoute> },
        // { path: '/allorders', element: <ProtectedRoute><Allorders /></ProtectedRoute> },

        { path: '/account-recovery', element: <Recovery /> },
        { path: '/login', element: <Login /> },
        { path: '/register', element: <Register /> },

      ]
    },

    { path: '*', element: <Notfound /> }


  ])
  return (
    <>
      <AuthProvider>
        {/* <CartContextProvider> */}
          <RouterProvider router={routes} />
          <ToastContainer />
        {/* </CartContextProvider> */}
      </AuthProvider>
    </>
  );
}

export default App;